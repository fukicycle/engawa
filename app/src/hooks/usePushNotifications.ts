import { useEffect, useState } from 'react';
import { ref, set } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const { currentUser } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribeUser = async () => {
    if (!currentUser || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported on this device/browser');
      return;
    }

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from env variables
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn('VITE_VAPID_PUBLIC_KEY is not defined. Skipping push subscription.');
        return;
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // Save subscription details in RTDB under user's profile
      const subscriptionRef = ref(database, `pushSubscriptions/${currentUser.uid}`);
      await set(subscriptionRef, subscription.toJSON());
      
      setIsSubscribed(true);
      console.log('User successfully subscribed to push notifications:', subscription);
    } catch (err) {
      console.error('Failed to subscribe user to push notifications:', err);
    }
  };

  // Auto subscribe if permission is already granted and user is logged in
  useEffect(() => {
    if (currentUser && permission === 'granted' && !isSubscribed) {
      subscribeUser();
    }
  }, [currentUser, permission]);

  return {
    permission,
    isSubscribed,
    subscribeUser,
  };
};
export default usePushNotifications;
