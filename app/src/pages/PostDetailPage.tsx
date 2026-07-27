import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, off, push, set, get } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { LeafBackground } from '../components/LeafBackground';
import { ArrowLeftIcon, SendIcon, LeafIcon, EditIcon, TrashIcon } from '../components/Icons';
import { Dialog } from '../components/Dialog';
import { decryptText } from '../utils/crypto';
import type { Post, Message, Reaction, UserProfile, CalendarEvent } from '../types';

const getBodyTextClass = (_size: 'small' | 'normal' | 'large') => {
  return 'text-sm leading-relaxed font-medium'; // Dynamically scaled by root HTML font-size!
};

const getTitleTextClass = (size: 'small' | 'normal' | 'large') => {
  if (size === 'small') return 'text-[12px] font-bold';
  if (size === 'large') return 'text-[16px] font-extrabold tracking-wide';
  return 'text-[14px] font-bold'; // normal (14px!)
};

export const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile, fontSize, switchFamily } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [linkedEvent, setLinkedEvent] = useState<CalendarEvent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [postLoading, setPostLoading] = useState(true);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [familyMembers, setFamilyMembers] = useState<Record<string, UserProfile>>({});
  
  const [newMessage, setNewMessage] = useState('');
  const [customReaction, setCustomReaction] = useState('');
  const [isReactionOpen, setIsReactionOpen] = useState(false);

  // States for deep link highlighting
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // States for Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogIsConfirm, setDialogIsConfirm] = useState(false);
  const [dialogOnConfirm, setDialogOnConfirm] = useState<(() => void) | undefined>(undefined);

  // States for "Add to Calendar" inline form
  const [isCalendarFormOpen, setIsCalendarFormOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Automatic Workspace Context Switching on Deep Link (Slack / Teams style)
  useEffect(() => {
    if (!postId || !userProfile?.families || !userProfile.activeFamilyId) return;

    const resolvePostFamily = async () => {
      try {
        const familyIds = Object.keys(userProfile.families || {});
        
        // 1. If the post exists under the currently active family, we are already in the correct workspace!
        const activePostSnap = await get(ref(database, `posts/${userProfile.activeFamilyId}/${postId}`));
        if (activePostSnap.exists()) {
          return;
        }

        // 2. Otherwise, search other joined families to find where the post is stored
        for (const fid of familyIds) {
          if (fid === userProfile.activeFamilyId) continue;
          const snap = await get(ref(database, `posts/${fid}/${postId}`));
          if (snap.exists()) {
            // Found! Auto-switch active family workspace instantly and silently!
            console.log(`Deep link workspace mismatch: Post ${postId} is in family ${fid}. Auto-switching!`);
            await switchFamily(fid);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to resolve post family for dynamic switching:", err);
      }
    };

    resolvePostFamily();
  }, [postId, userProfile?.families, userProfile?.activeFamilyId, switchFamily]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!postId || !userProfile?.activeFamilyId) return;

    const familyId = userProfile.activeFamilyId;

    // Record the user has read this post (clears unread state)
    set(ref(database, `users/${currentUser.uid}/readPosts/${postId}`), Date.now());

    // 1. Fetch all family members for display names
    const familyMembersRef = ref(database, `families/${familyId}/members`);
    get(familyMembersRef).then(async (snapshot) => {
      if (snapshot.exists()) {
        const membersMap = snapshot.val() as Record<string, boolean>;
        const profiles: Record<string, UserProfile> = {};
        await Promise.all(
          Object.keys(membersMap).map(async (uid) => {
            const userSnapshot = await get(ref(database, `users/${uid}`));
            if (userSnapshot.exists()) {
              profiles[uid] = userSnapshot.val() as UserProfile;
            }
          })
        );
        setFamilyMembers(profiles);
      }
    });

    // 2. Listen to Post Detail
    const postRef = ref(database, `posts/${familyId}/${postId}`);
    onValue(postRef, (snapshot) => {
      if (snapshot.exists()) {
        const postData = snapshot.val() as Post;
        setPost(postData);
        
        // Fetch linked calendar event details if present
        if (postData.type === 'calendar' && postData.eventId) {
          const eventRef = ref(database, `calendarEvents/${familyId}/${postData.eventId}`);
          get(eventRef).then((evSnapshot) => {
            if (evSnapshot.exists()) {
              setLinkedEvent(evSnapshot.val() as CalendarEvent);
            }
            setPostLoading(false);
          });
        } else {
          setPostLoading(false);
        }
      } else {
        setPost(null);
        setPostLoading(false);
      }
    });

    // 3. Listen to Messages
    const messagesRef = ref(database, `messages/${postId}`);
    onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: Message[] = Object.keys(data).map((key) => ({
          ...data[key],
          id: key,
        }));
        list.sort((a, b) => a.createdAt - b.createdAt);
        setMessages(list);
        setTimeout(scrollToBottom, 100);
      } else {
        setMessages([]);
      }
    });

    // 4. Listen to Reactions
    const reactionsRef = ref(database, `reactions/${postId}`);
    onValue(reactionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: Reaction[] = Object.keys(data).map((key) => ({
          ...data[key],
          id: key,
        }));
        setReactions(list);
      } else {
        setReactions([]);
      }
    });

    return () => {
      off(postRef);
      off(messagesRef);
      off(reactionsRef);
    };
  }, [postId, userProfile?.activeFamilyId]);

  // Deep-linking scroll to message and highlight
  useEffect(() => {
    if (!postLoading && messages.length > 0) {
      const hash = window.location.hash;
      const queryIdx = hash.indexOf('?');
      if (queryIdx !== -1) {
        const params = new URLSearchParams(hash.substring(queryIdx));
        const targetMsgId = params.get('msgId');
        if (targetMsgId) {
          setHighlightedMsgId(targetMsgId);
          setTimeout(() => {
            const el = document.getElementById(`msg-${targetMsgId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Remove highlight after 3.5 seconds for a gentle fading out of focus
              setTimeout(() => setHighlightedMsgId(null), 3500);
            }
          }, 600);
        }
      }
    }
  }, [postLoading, messages.length]);

  // Prefill event title when "Add to Calendar" form opens
  useEffect(() => {
    if (isCalendarFormOpen && post) {
      setEventTitle(decryptText(post.content).substring(0, 30).trim());
    }
  }, [isCalendarFormOpen, post]);

  // Prefill editContent when isEditing opens
  useEffect(() => {
    if (isEditing && post) {
      setEditContent(decryptText(post.content));
    }
  }, [isEditing, post]);

  const handleVote = async (optionId: string) => {
    if (!currentUser || !userProfile?.activeFamilyId || !postId) return;
    const voteRef = ref(
      database,
      `posts/${userProfile.activeFamilyId}/${postId}/pollOptions/${optionId}/votes/${currentUser.uid}`
    );
    
    const snapshot = await get(voteRef);
    if (snapshot.exists() && snapshot.val() === true) {
      await set(voteRef, null);
    } else {
      await set(voteRef, true);
    }
  };

  const handleAddToCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate || !currentUser || !userProfile?.activeFamilyId || !postId || !post) return;

    try {
      const familyId = userProfile.activeFamilyId;
      
      // 1. Create calendar event
      const eventsRef = ref(database, `calendarEvents/${familyId}`);
      const newEventRef = push(eventsRef);
      const eventId = newEventRef.key!;

      const eventData = {
        id: eventId,
        title: eventTitle.trim(),
        description: eventDesc.trim() || '',
        date: eventDate,
        startTime: eventStartTime || '',
        endTime: eventEndTime || '',
        authorId: currentUser.uid,
        linkedPostId: postId,
      };
      await set(newEventRef, eventData);

      // 2. Update post to represent a calendar-linked post
      const postRef = ref(database, `posts/${familyId}/${postId}`);
      await set(postRef, {
        ...post,
        type: 'calendar',
        eventId: eventId,
      });

      // 3. Enqueue notification for family members
      const familyMembersRef = ref(database, `families/${familyId}/members`);
      const snapshot = await get(familyMembersRef);
      if (snapshot.exists()) {
        const membersMap = snapshot.val() as Record<string, boolean>;
        const targetUids: Record<string, boolean> = {};
        for (const uid in membersMap) {
          if (uid !== currentUser.uid) {
            targetUids[uid] = true;
          }
        }

        if (Object.keys(targetUids).length > 0) {
          const queueRef = ref(database, 'notificationQueue');
          const newQueueItemRef = push(queueRef);
          await set(newQueueItemRef, {
            id: newQueueItemRef.key,
            familyId,
            type: 'new_event',
            title: `予定登録: ${eventTitle.trim()}`,
            body: `${eventDate} に予定が追加されました。`,
            targetUids,
            linkPath: `/post/${postId}`,
            createdAt: Date.now(),
          });
        }
      }

      setIsCalendarFormOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim() || !currentUser || !userProfile?.activeFamilyId || !postId || !post) return;

    try {
      const familyId = userProfile.activeFamilyId;
      const postRef = ref(database, `posts/${familyId}/${postId}`);
      await set(postRef, {
        ...post,
        content: editContent.trim(),
        edited: true,
        editedAt: Date.now()
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async () => {
    if (!currentUser || !userProfile?.activeFamilyId || !postId || !post) return;
    
    setDialogTitle('削除の確認');
    setDialogMessage('この投稿と、ぶら下がっているすべてのやり取りを削除してもよろしいですか？（連動するカレンダー予定も削除されます）');
    setDialogIsConfirm(true);
    setDialogOnConfirm(() => async () => {
      try {
        const familyId = userProfile.activeFamilyId;

        // 1. Delete parent post
        await set(ref(database, `posts/${familyId}/${postId}`), null);

        // 2. Delete messages/replies
        await set(ref(database, `messages/${postId}`), null);

        // 3. Delete reactions
        await set(ref(database, `reactions/${postId}`), null);

        // 4. Delete linked calendar event if present
        if (post.eventId) {
          await set(ref(database, `calendarEvents/${familyId}/${post.eventId}`), null);
        }

        navigate('/');
      } catch (err) {
        console.error(err);
      }
    });
    setDialogOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !userProfile?.activeFamilyId || !post || !postId) return;

    try {
      const familyId = userProfile.activeFamilyId;

      // 1. Update post metadata (replyCount, lastReplyAt) and participants
      const replyCount = (post.replyCount || 0) + 1;
      const lastReplyAt = Date.now();
      
      const postUpdateRef = ref(database, `posts/${familyId}/${postId}`);
      await set(postUpdateRef, {
        ...post,
        replyCount,
        lastReplyAt,
        participants: {
          ...(post.participants || {}),
          [currentUser.uid]: true
        }
      });

      // 2. Write the message
      const messagesRef = ref(database, `messages/${postId}`);
      const newMessageRef = push(messagesRef);
      const messageData = {
        id: newMessageRef.key,
        authorId: currentUser.uid,
        authorName: userProfile.name,
        authorIcon: userProfile.icon || '',
        text: newMessage.trim(),
        createdAt: Date.now(),
      };
      await set(newMessageRef, messageData);

      // 3. Trigger Notification for participating members only
      const targetUids: Record<string, boolean> = {};
      const currentParticipants = post.participants || {};

      // Send to all current participants EXCEPT the sender
      for (const uid in currentParticipants) {
        if (uid !== currentUser.uid) {
          targetUids[uid] = true;
        }
      }

      if (Object.keys(targetUids).length > 0) {
        const queueRef = ref(database, 'notificationQueue');
        const newQueueItemRef = push(queueRef);
        const notifId = newQueueItemRef.key!;
        const linkPathWithMsg = `/post/${postId}?msgId=${newMessageRef.key}`;

        // 1. Write to background push queue
        await set(newQueueItemRef, {
          id: notifId,
          familyId,
          type: 'new_reply',
          title: `返信: ${userProfile.name}さん`,
          body: newMessage.trim().substring(0, 40),
          targetUids,
          linkPath: linkPathWithMsg,
          createdAt: Date.now(),
        });
      }

      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReaction = async (text: string) => {
    if (!text.trim() || !currentUser || !postId) return;
    
    try {
      const reactionsRef = ref(database, `reactions/${postId}`);
      const existingReaction = reactions.find(
        (r) => r.authorId === currentUser.uid && r.text === text.trim()
      );

      if (existingReaction) {
        await set(ref(database, `reactions/${postId}/${existingReaction.id}`), null);
      } else {
        const newReactionRef = push(reactionsRef);
        await set(newReactionRef, {
          id: newReactionRef.key,
          authorId: currentUser.uid,
          authorName: userProfile?.name || '匿名',
          text: text.trim().substring(0, 10),
          createdAt: Date.now(),
        });
      }

      setCustomReaction('');
      setIsReactionOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (postLoading) {
    return (
      <div className="relative h-screen overflow-hidden pt-4 px-4 pb-20 max-w-md mx-auto flex flex-col gap-4 animate-gentleFadeIn">
        <LeafBackground />
        
        {/* Skeleton Master Card */}
        <div className="relative z-10 glass-card rounded-3xl flex-1 flex flex-col overflow-hidden border border-white/40 shadow-xl min-h-0">
          
          {/* Skeleton Post Header */}
          <div className="p-5 flex flex-col gap-4 shrink-0 bg-white/20 border-b border-wood-900/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full skeleton-shimmer shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="w-20 h-3 rounded skeleton-shimmer" />
                <div className="w-28 h-2 rounded skeleton-shimmer" />
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-1">
              <div className="w-full h-4 rounded skeleton-shimmer" />
              <div className="w-4/5 h-4 rounded skeleton-shimmer" />
            </div>
            <div className="flex border-t border-wood-900/5 pt-3 mt-1 justify-between">
              <div className="w-20 h-3 rounded skeleton-shimmer" />
              <div className="w-16 h-3 rounded skeleton-shimmer" />
            </div>
          </div>

          {/* Skeleton Replies Container */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 bg-white/5">
            <div className="w-24 h-3 rounded skeleton-shimmer" />
            
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full skeleton-shimmer shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <div className="w-16 h-2 rounded skeleton-shimmer" />
                <div className="w-3/5 h-8 rounded-2xl skeleton-shimmer" />
              </div>
            </div>

            <div className="flex gap-2.5 items-start flex-row-reverse">
              <div className="w-7 h-7 rounded-full skeleton-shimmer shrink-0" />
              <div className="flex flex-col gap-1 items-end flex-1">
                <div className="w-16 h-2 rounded skeleton-shimmer" />
                <div className="w-1/2 h-8 rounded-2xl skeleton-shimmer" />
              </div>
            </div>
          </div>

        </div>

        {/* Skeleton Bottom Navigation bar */}
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto flex gap-2 items-center">
          <div className="w-12 h-12 rounded-full skeleton-shimmer shrink-0" />
          <div className="flex-1 h-12 rounded-2xl skeleton-shimmer" />
          <div className="w-12 h-12 rounded-full skeleton-shimmer shrink-0" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        <LeafBackground />
        <div className="relative z-10 glass-card rounded-3xl p-8 text-center text-wood-900/90 font-bold text-sm">
          投稿が見つからないか、削除されました。
          <button onClick={() => navigate('/')} className="mt-4 block w-full py-2 bg-engawa-600 hover:bg-engawa-700 text-white rounded-xl">
            縁側に戻る
          </button>
        </div>
      </div>
    );
  }

  const postAuthor = familyMembers[post.authorId] || { name: post.authorName, icon: post.authorIcon };
  const isPostAuthor = currentUser?.uid === post.authorId;

  return (
    <div className="relative h-dvh overflow-hidden pt-4 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] max-w-md mx-auto flex flex-col gap-3 animate-gentleSlideUp">
      <LeafBackground />

      {/* INTEGRATED MASTER SINGLE-CARD */}
      <div className="relative z-10 glass-card rounded-2xl flex-1 flex flex-col overflow-hidden border border-white/40 shadow-xl min-h-0">
        
        {/* UPPER STATIC SECTION (POST DETAILS) */}
        <div className="p-5 flex flex-col gap-3.5 shrink-0 bg-white/20 border-b border-wood-900/5">
          {/* Author Details and Edit/Delete controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={postAuthor.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.authorId}`}
                alt={postAuthor.name}
                className="w-8 h-8 rounded-full border border-white/30 bg-white/50"
              />
              <div>
                <h4 className={`font-extrabold text-engawa-800 ${getTitleTextClass(fontSize)}`}>{postAuthor.name}</h4>
                <p className="text-xs text-wood-900/80 font-bold">
                  {new Date(post.createdAt).toLocaleString('ja-JP')}
                  {post.edited && (
                    <span className="text-wood-900/30 font-bold ml-1 text-[8px] bg-wood-900/5 px-1 py-0.5 rounded-md">編集済</span>
                  )}
                </p>
              </div>
            </div>

            {/* Edit / Delete Buttons for Author */}
            {isPostAuthor && !isEditing && (
              <div className="flex gap-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-8 h-8 rounded-full hover:bg-engawa-500/10 text-engawa-600/70 hover:text-engawa-700 flex items-center justify-center transition-colors"
                  title="編集する"
                >
                  <EditIcon size={16} />
                </button>
                <button
                  onClick={handleDeletePost}
                  className="w-8 h-8 rounded-full hover:bg-red-500/10 text-red-500/60 hover:text-red-600 flex items-center justify-center transition-colors"
                  title="削除する"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Calendar Linked Event Banner (if present and calendar-type) */}
          {post.type === 'calendar' && linkedEvent && (
            <div className="flex flex-col gap-3 p-3 rounded-2xl bg-white/40 border border-white/50 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-14 bg-white rounded-xl border border-wood-300 shadow flex flex-col items-center overflow-hidden shrink-0">
                  <div className="w-full bg-red-500 text-white text-[8px] font-bold py-0.5 text-center tracking-widest">
                    {linkedEvent.date.split('-')[1]}月
                  </div>
                  <div className="text-wood-900 font-black text-lg leading-none mt-1">
                    {parseInt(linkedEvent.date.split('-')[2])}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-bold tracking-widest bg-engawa-100 text-engawa-700 px-2 py-0.5 rounded-md border border-engawa-500/10">
                    暦の予定
                  </span>
                  <h3 className="text-xs font-extrabold text-engawa-800 truncate mt-0.5">{linkedEvent.title}</h3>
                  <p className="text-[9px] text-wood-900/90 font-bold mt-0.5">
                    時間: {linkedEvent.startTime ? `${linkedEvent.startTime}${linkedEvent.endTime ? ` ~ ${linkedEvent.endTime}` : ''}` : '終日'}
                  </p>
                </div>
              </div>

              {/* Event Attendees Roster & In-Context Toggle button */}
              <div className="border-t border-wood-900/5 pt-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-wood-900/60">参加予定のメンバー:</span>
                  {currentUser && (() => {
                    const attendeesMap = linkedEvent.attendees || {};
                    const isAttending = attendeesMap[currentUser.uid] === true;
                    
                    return (
                      <button
                        onClick={async () => {
                          if (!userProfile?.activeFamilyId) return;
                          const attendeeRef = ref(database, `calendarEvents/${userProfile.activeFamilyId}/${linkedEvent.id}/attendees/${currentUser.uid}`);
                          await set(attendeeRef, !isAttending);
                          
                          // Dynamically refresh local state in PostDetailPage!
                          setLinkedEvent(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              attendees: {
                                ...(prev.attendees || {}),
                                [currentUser.uid]: !isAttending
                              }
                            };
                          });
                        }}
                        className={`text-[8px] font-bold px-2 py-1 rounded-lg border transition-all active:scale-95 ${
                          isAttending
                            ? 'bg-red-500/10 border-red-500/20 text-red-700'
                            : 'bg-engawa-600 border-transparent text-white'
                        }`}
                      >
                        {isAttending ? '不参加にする' : '参加する'}
                      </button>
                    );
                  })()}
                </div>

                {/* Avatars of participants */}
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {(() => {
                    const attendeesMap = linkedEvent.attendees || {};
                    const attendeeUids = Object.keys(attendeesMap).filter(uid => attendeesMap[uid] === true);
                    
                    if (attendeeUids.length === 0) {
                      return <span className="text-[9px] text-wood-900/40 font-bold">誰も参加予定ではありません</span>;
                    }
                    
                    return attendeeUids.map((uid) => {
                      const member = familyMembers[uid] || { name: '...', icon: '' };
                      return (
                        <div key={uid} className="flex items-center gap-1 bg-white/40 border border-white/60 px-2 py-0.5 rounded-full" title={member.name}>
                          <img
                            src={member.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                            alt={member.name}
                            className="w-4.5 h-4.5 rounded-full border border-white/20 bg-white/50"
                          />
                          <span className="text-[9px] font-bold text-wood-900/80">{member.name}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Post Content rendering / Edit Mode Textarea */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-2.5">
              <textarea
                required
                rows={3}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full glass-input rounded-2xl px-3 py-2 text-base text-wood-900 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-[10px] font-bold text-wood-900/75 px-3 py-1.5 rounded-lg hover:bg-wood-900/5"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="text-[10px] font-bold text-white bg-engawa-600 hover:bg-engawa-700 px-4 py-1.5 rounded-lg shadow-sm"
                >
                  保存する
                </button>
              </div>
            </form>
          ) : (
            <p className={`font-medium break-all whitespace-pre-line px-1 text-wood-900 ${getBodyTextClass(fontSize)}`}>
              {decryptText(post.content)}
            </p>
          )}

          {/* Poll Special UI */}
          {post.type === 'poll' && post.pollOptions && (
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white/30 border border-white/40">
              {Object.values(post.pollOptions).map((opt) => {
                const votesMap = opt.votes || {};
                const voteCount = Object.keys(votesMap).length;
                const hasVoted = currentUser ? votesMap[currentUser.uid] === true : false;
                
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border text-[11px] font-bold transition-all relative overflow-hidden ${
                      hasVoted
                        ? 'bg-engawa-600/10 border-engawa-600/30 text-engawa-800'
                        : 'bg-white/40 border-white/50 hover:bg-white/60 text-wood-900/70'
                    }`}
                  >
                    <span>{decryptText(opt.text)}</span>
                    <span className="bg-white/60 px-1.5 py-0.5 rounded-md border border-white text-[9px]">
                      {voteCount} 票
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Inline Add to Calendar Form */}
          {post.type === 'text' && isCalendarFormOpen && (
            <form onSubmit={handleAddToCalendar} className="bg-wood-50/80 border border-wood-200 p-4 rounded-2xl flex flex-col gap-3 mt-1 animate-fadeIn">
              <h4 className="text-xs font-bold text-engawa-800 tracking-wider flex items-center gap-1.5">
                <span>📅</span>
                <span>この会話の内容を暦（カレンダー）に登録</span>
              </h4>
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-wood-900/80">予定のタイトル</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="glass-input rounded-xl px-2.5 py-2.5 text-sm text-wood-900"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-wood-900/80">日付</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="glass-input rounded-xl px-2.5 py-2.5 text-sm text-wood-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-wood-900/80">開始時間</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="glass-input rounded-xl px-2 py-2.5 text-sm text-center text-wood-900"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-wood-900/80">終了時間</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="glass-input rounded-xl px-2 py-2.5 text-sm text-center text-wood-900"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-wood-900/80">メモ（任意）</label>
                <textarea
                  rows={1}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="場所やメモなど..."
                  className="glass-input rounded-xl px-3 py-2 text-base text-wood-900 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setIsCalendarFormOpen(false)}
                  className="text-[10px] font-bold text-wood-900/75 px-3 py-1.5 rounded-lg hover:bg-wood-900/5"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="text-[10px] font-bold text-white bg-engawa-600 hover:bg-engawa-700 px-4 py-1.5 rounded-lg shadow-sm"
                >
                  登録する
                </button>
              </div>
            </form>
          )}

          {/* Reaction Bubbles list */}
          {reactions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1 px-1">
              {reactions.reduce((acc, current) => {
                const existing = acc.find((item) => item.text === current.text);
                if (existing) {
                  existing.users.push(current.authorName);
                } else {
                  acc.push({ text: current.text, users: [current.authorName] });
                }
                return acc;
              }, [] as Array<{ text: string; users: string[] }>).map((item, idx) => (
                <div
                  key={idx}
                  title={item.users.join(', ')}
                  className="text-[10px] font-bold bg-white/50 border border-white/70 px-2.5 py-1 rounded-full text-engawa-800 shadow-sm cursor-help"
                >
                  {item.text} <span className="text-wood-900/75 font-extrabold ml-0.5">{item.users.length}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action triggers (Add to Calendar, Leave Reaction) */}
          <div className="flex border-t border-wood-900/5 pt-2 mt-1 justify-between items-center">
            {post.type === 'text' && !isCalendarFormOpen && (
              <button
                onClick={() => setIsCalendarFormOpen(true)}
                className="text-[10px] font-bold text-engawa-700 hover:text-engawa-800 bg-wood-100 hover:bg-wood-200/50 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1"
              >
                <span>📅</span>
                <span>暦に追加する</span>
              </button>
            )}
            <div className="ml-auto">
              <button
                onClick={() => setIsReactionOpen(!isReactionOpen)}
                className="text-[10px] font-bold text-engawa-600 hover:text-engawa-700 bg-white/30 border border-white/40 px-3 py-1.5 rounded-full transition-colors"
              >
                リアクションを残す
              </button>
            </div>
          </div>

          {/* Keyboard / Emoji Reaction Panel */}
          {isReactionOpen && (
            <div className="bg-white/40 border border-white/50 rounded-2xl p-2.5 flex flex-col gap-2.5 animate-fadeIn">
              <div className="flex gap-2 justify-around">
                {['👍', '❤️', '😊', '😮', '👏', '🙏'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(emoji)}
                    className="text-lg hover:scale-125 active:scale-95 transition-all p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={10}
                  value={customReaction}
                  onChange={(e) => setCustomReaction(e.target.value)}
                  placeholder="10文字以内の言葉を入力..."
                  className="flex-1 glass-input rounded-xl px-3 py-1.5 text-base text-wood-900 placeholder:text-wood-900/30"
                />
                <button
                  onClick={() => handleAddReaction(customReaction)}
                  className="bg-engawa-600 hover:bg-engawa-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
                >
                  決定
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE SCROLLABLE SECTION (MESSAGES / REPLIES LIST) */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-h-0 bg-white/5 hide-scrollbar">
          <h3 className={`font-extrabold text-wood-900/80 tracking-wider ${getTitleTextClass(fontSize)}`}>やり取り一覧 ({messages.length})</h3>

          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8 text-wood-900/30">
              <LeafIcon size={32} className="opacity-20" />
              <p className="text-[10px] font-bold">まだやり取りはありません。<br />お話ししてみましょう。</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg) => {
                const isMe = msg.authorId === currentUser?.uid;
                const msgAuthor = familyMembers[msg.authorId] || { name: msg.authorName, icon: msg.authorIcon };
                const isHighlighted = msg.id === highlightedMsgId;

                return (
                  <div 
                    key={msg.id} 
                    id={`msg-${msg.id}`} 
                    className={`flex items-start gap-2.5 transition-all duration-500 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    <img
                      src={msgAuthor.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.authorId}`}
                      alt={msgAuthor.name}
                      className="w-7 h-7 rounded-full border border-white/30 bg-white/50 mt-0.5"
                    />
                    <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : ''}`}>
                      <span className="text-xs font-bold text-wood-900/80 mb-0.5">{msgAuthor.name}</span>
                      <div className={`p-3 rounded-2xl font-medium leading-relaxed break-all transition-all duration-500 ${
                        isHighlighted
                          ? 'bg-engawa-100 border border-engawa-500/40 text-engawa-800 ring-2 ring-engawa-600/20 scale-[1.02] shadow shadow-engawa-500/10'
                          : isMe 
                            ? 'bg-engawa-600 text-white rounded-tr-none shadow-sm shadow-engawa-600/10' 
                            : 'bg-white/50 border border-white/40 text-wood-900 rounded-tl-none'
                      } ${getBodyTextClass(fontSize)}`}>
                        {decryptText(msg.text)}
                      </div>
                      <span className="text-xs text-wood-900/75 font-bold mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ERGONOMIC BOTTOM composite navigation & reply inputs bar */}
      <div className="relative w-full z-40 px-0 pt-2 pb-1 bg-transparent flex gap-2 items-center shrink-0">
        {/* Thumb-reachable Circular Back Button */}
        <button
          onClick={() => navigate('/')}
          className="w-12 h-12 rounded-full bg-white/50 hover:bg-white/80 border border-white/60 text-wood-900/70 hover:text-wood-900/90 flex items-center justify-center shadow-md transition-all shrink-0 active:scale-95"
          title="戻る"
        >
          <ArrowLeftIcon size={20} />
        </button>

        {/* Message Compose Form */}
        <form onSubmit={handleSendMessage} className="flex-1 min-w-0 flex gap-2 items-center">
          <input
            type="text"
            required
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="返信を入力..."
            className="flex-1 glass-input rounded-2xl px-4 py-3.5 text-base text-wood-900 placeholder:text-wood-900/30 shadow-md"
          />
          <button
            type="submit"
            className="w-12 h-12 rounded-full bg-engawa-600 hover:bg-engawa-700 text-white flex items-center justify-center shadow-md shadow-engawa-600/15 transition-all shrink-0 active:scale-95 border border-white/10"
          >
            <SendIcon size={18} />
          </button>
        </form>
      </div>
      {/* Custom Reusable Dialog Modals */}
      <Dialog
        isOpen={dialogOpen}
        title={dialogTitle}
        message={dialogMessage}
        isConfirm={dialogIsConfirm}
        onConfirm={dialogOnConfirm}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};
