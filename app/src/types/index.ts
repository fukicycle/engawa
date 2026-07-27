export interface UserProfile {
  uid: string;
  name: string;
  icon?: string;
  familyId?: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  inviteCode: string;
  members: Record<string, boolean>; // uid -> true
  createdAt: number;
}

export type PostType = 'text' | 'poll' | 'calendar';

export interface PollOption {
  id: string;
  text: string;
  votes?: Record<string, boolean>; // uid -> true
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorIcon?: string;
  type: PostType;
  content: string; // post text or poll question
  createdAt: number;
  participants: Record<string, boolean>; // uid -> true (members in this conversation)
  
  // Optional for Poll type
  pollOptions?: Record<string, PollOption>;
  pollClosed?: boolean;
  
  // Optional for Calendar type
  eventId?: string;

  // Metadata for replies
  replyCount?: number;
  lastReplyAt?: number;

  // Metadata for editing
  edited?: boolean;
  editedAt?: number;
}

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  linkPath: string; // e.g., /post/postId?msgId=msgId
  read: boolean;
  createdAt: number;
}

export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorIcon?: string;
  text: string;
  createdAt: number;
}

export interface Reaction {
  id: string;
  authorId: string;
  authorName: string;
  text: string; // emoji or <= 10 characters
  createdAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  authorId: string;
  linkedPostId?: string; // optional link to a discussion post
}

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationQueueItem {
  id: string;
  familyId: string;
  type: 'new_post' | 'new_poll' | 'new_event' | 'new_reply';
  title: string;
  body: string;
  targetUids: Record<string, boolean>; // uids of users to receive notification
  linkPath: string; // e.g., /post/post123
  createdAt: number;
}
