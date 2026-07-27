const admin = require('firebase-admin');
const webpush = require('web-push');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 1. Validate environment variables
const requiredEnv = [
  'FIREBASE_DATABASE_URL',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT'
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// 2. Load service account credentials
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || './service-account.json';
const resolvedPath = path.resolve(__dirname, serviceAccountPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: Firebase Service Account JSON file not found at ${resolvedPath}.`);
  console.error('Please download your service account JSON file from Firebase Console and place it there.');
  process.exit(1);
}

const serviceAccount = require(resolvedPath);

// 3. Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();
console.log('Firebase Admin SDK successfully initialized.');

// 4. Configure Web Push VAPID Details
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
console.log('Web-Push VAPID details configured.');

// 5. Monitor notification queue
const queueRef = db.ref('notificationQueue');

console.log('Engawa notification listener started. Watching "notificationQueue" for new tasks...');

queueRef.on('child_added', async (snapshot) => {
  const queueId = snapshot.key;
  const item = snapshot.val();
  
  if (!item) return;

  console.log(`\n[NEW TASK] Processing notification: "${item.title}" (${queueId})`);

  const targetUids = Object.keys(item.targetUids || {});
  if (targetUids.length === 0) {
    console.log('No targets specified for this notification. Deleting from queue.');
    await db.ref(`notificationQueue/${queueId}`).remove();
    return;
  }

  const pushPromises = targetUids.map(async (uid) => {
    try {
      // Fetch user's subscription
      const subSnapshot = await db.ref(`pushSubscriptions/${uid}`).get();
      if (!subSnapshot.exists()) {
        console.log(`- Skipping UID ${uid}: No active push subscription found.`);
        return;
      }

      const subscription = subSnapshot.val();

      // 1. Write the notification record to the target user's in-app notification list first (using Server/Admin rights, which bypasses all security rules!)
      await db.ref(`userNotifications/${uid}/${queueId}`).set({
        id: queueId,
        title: item.title,
        body: item.body,
        linkPath: item.linkPath || '/',
        read: false,
        createdAt: item.createdAt || Date.now()
      });

      // 2. Fetch user's current unread notifications count (will be 100% accurate because the new one is already written above!)
      const notifsSnapshot = await db.ref(`userNotifications/${uid}`).get();
      let unreadCount = 0;
      if (notifsSnapshot.exists()) {
        const notifs = notifsSnapshot.val();
        unreadCount = Object.values(notifs).filter(n => !n.read).length;
      }

      console.log(`- UID: ${uid} | DB Unread Count (Includes New): ${unreadCount} | Sending Badge Count: ${unreadCount}`);

      // Payload schema
      const payload = JSON.stringify({
        title: item.title,
        body: item.body,
        badgeCount: unreadCount,
        data: {
          linkPath: item.linkPath || '/'
        }
      });

      // Send the Web Push notification
      await webpush.sendNotification(subscription, payload);
      console.log(`- Successfully sent push notification to UID: ${uid}`);
    } catch (error) {
      console.error(`- Failed to send push to UID ${uid}:`, error.message);
      
      // 410 Gone / 404 Not Found indicates subscription expired or unregistered
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`- Subscription for UID ${uid} is no longer valid. Deleting subscription record from database.`);
        await db.ref(`pushSubscriptions/${uid}`).remove();
      }
    }
  });

  // Wait for all push sends to finish
  await Promise.all(pushPromises);

  // Remove processed notification from queue
  try {
    await db.ref(`notificationQueue/${queueId}`).remove();
    console.log(`[DONE] Finished processing task ${queueId}. Removed from queue.`);
  } catch (err) {
    console.error(`Error removing task ${queueId} from queue:`, err);
  }
});
