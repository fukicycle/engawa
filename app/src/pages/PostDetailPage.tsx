import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, off, push, set, get } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { LeafBackground } from '../components/LeafBackground';
import { ArrowLeftIcon, SendIcon, LeafIcon } from '../components/Icons';
import type { Post, Message, Reaction, UserProfile, CalendarEvent } from '../types';

export const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [linkedEvent, setLinkedEvent] = useState<CalendarEvent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [familyMembers, setFamilyMembers] = useState<Record<string, UserProfile>>({});
  
  const [newMessage, setNewMessage] = useState('');
  const [customReaction, setCustomReaction] = useState('');
  const [isReactionOpen, setIsReactionOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!postId || !userProfile?.familyId) return;

    const familyId = userProfile.familyId;

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
          });
        }
      } else {
        setPost(null);
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
  }, [postId, userProfile?.familyId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !userProfile?.familyId || !post || !postId) return;

    try {
      const familyId = userProfile.familyId;

      // 1. Add current user as a participant to this conversation
      const participantRef = ref(database, `posts/${familyId}/${postId}/participants/${currentUser.uid}`);
      await set(participantRef, true);

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
        await set(newQueueItemRef, {
          id: newQueueItemRef.key,
          familyId,
          type: 'new_reply',
          title: `返信: ${userProfile.name}さん`,
          body: newMessage.trim().substring(0, 40),
          targetUids,
          linkPath: `/post/${postId}`,
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
      
      // Check if user already reacted with the EXACT same text, if so, remove it (toggle)
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
          text: text.trim().substring(0, 10), // Limit to 10 chars
          createdAt: Date.now(),
        });
      }

      setCustomReaction('');
      setIsReactionOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (!post) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        <LeafBackground />
        <div className="relative z-10 glass-card rounded-3xl p-8 text-center text-wood-900/60 font-bold text-sm">
          投稿が見つからないか、削除されました。
          <button onClick={() => navigate('/')} className="mt-4 block w-full py-2 bg-engawa-600 hover:bg-engawa-700 text-white rounded-xl">
            縁側に戻る
          </button>
        </div>
      </div>
    );
  }

  const postAuthor = familyMembers[post.authorId] || { name: post.authorName, icon: post.authorIcon };

  return (
    <div className="relative min-h-screen pb-20 pt-4 px-4 overflow-hidden max-w-md mx-auto flex flex-col gap-4">
      <LeafBackground />

      {/* Detail Header */}
      <header className="relative z-10 w-full glass rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-white/40 shadow-sm">
        <button
          onClick={() => navigate('/')}
          className="p-1 rounded-full hover:bg-wood-900/5 text-wood-900/60"
        >
          <ArrowLeftIcon size={20} />
        </button>
        <span className="text-sm font-extrabold tracking-widest text-engawa-800 font-soft">縁側のやり取り</span>
      </header>

      {/* Calendar Linked Event Banner */}
      {post.type === 'calendar' && linkedEvent && (
        <div className="relative z-10 glass-card rounded-3xl p-5 border border-white/40 shadow-sm flex items-center gap-4 bg-gradient-to-r from-wood-100/30 to-white/20">
          {/* Tear-off traditional calendar sheet */}
          <div className="w-14 h-16 bg-white rounded-xl border border-wood-300 shadow flex flex-col items-center overflow-hidden shrink-0">
            <div className="w-full bg-red-500 text-white text-[9px] font-bold py-1 text-center tracking-widest">
              {linkedEvent.date.split('-')[1]}月
            </div>
            <div className="text-wood-900 font-black text-xl leading-none mt-1.5">
              {parseInt(linkedEvent.date.split('-')[2])}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[8px] font-bold tracking-widest bg-engawa-100 text-engawa-700 px-2.5 py-0.5 rounded-md border border-engawa-500/10">
              暦（カレンダー）の予定
            </span>
            <h3 className="text-sm font-extrabold text-engawa-800 mt-1 truncate">{linkedEvent.title}</h3>
            <p className="text-[10px] text-wood-900/60 font-bold mt-0.5">
              時間: {linkedEvent.startTime ? `${linkedEvent.startTime}${linkedEvent.endTime ? ` ~ ${linkedEvent.endTime}` : ''}` : '終日'}
            </p>
            {linkedEvent.description && (
              <p className="text-[10px] text-wood-900/50 mt-1.5 pt-1.5 border-t border-wood-900/5 truncate">
                {linkedEvent.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main post box */}
      <div className="relative z-10 glass-card rounded-3xl p-5 border border-white/40 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src={postAuthor.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.authorId}`}
            alt={postAuthor.name}
            className="w-8 h-8 rounded-full border border-white/30 bg-white/50"
          />
          <div>
            <h4 className="text-xs font-extrabold text-engawa-800">{postAuthor.name}</h4>
            <p className="text-[9px] text-wood-900/40 font-medium">
              {new Date(post.createdAt).toLocaleString('ja-JP')}
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-wood-900/80 font-medium break-all whitespace-pre-line px-1">
          {post.content}
        </p>

        {/* Reaction Bubbles list */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 px-1">
            {reactions.reduce((acc, current) => {
              // Group reactions by text
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
                {item.text} <span className="text-wood-900/40 font-extrabold ml-0.5">{item.users.length}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reaction Drawer trigger */}
        <div className="flex border-t border-wood-900/5 pt-2.5 mt-1 justify-end">
          <button
            onClick={() => setIsReactionOpen(!isReactionOpen)}
            className="text-[10px] font-bold text-engawa-600 hover:text-engawa-700 bg-white/30 border border-white/40 px-3 py-1.5 rounded-full transition-colors"
          >
            リアクションを残す
          </button>
        </div>

        {/* Keyboard / Emoji Reaction Panel */}
        {isReactionOpen && (
          <div className="bg-white/40 border border-white/50 rounded-2xl p-3 flex flex-col gap-2.5 animate-fadeIn">
            {/* Quick emoji picks */}
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

            {/* Custom 10-char text input */}
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={10}
                value={customReaction}
                onChange={(e) => setCustomReaction(e.target.value)}
                placeholder="10文字以内の言葉を入力..."
                className="flex-1 glass-input rounded-xl px-3 py-2 text-xs text-wood-900 placeholder:text-wood-900/30"
              />
              <button
                onClick={() => handleAddReaction(customReaction)}
                className="bg-engawa-600 hover:bg-engawa-700 text-white font-bold px-3 py-2 rounded-xl text-xs"
              >
                決定
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages / Replies Box */}
      <div className="relative z-10 flex-1 glass-card rounded-3xl p-5 border border-white/40 shadow-sm flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-340px)] hide-scrollbar">
        <h3 className="text-xs font-extrabold text-wood-900/50 tracking-wider">やり取り一覧 ({messages.length})</h3>

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

              return (
                <div key={msg.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <img
                    src={msgAuthor.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.authorId}`}
                    alt={msgAuthor.name}
                    className="w-7 h-7 rounded-full border border-white/30 bg-white/50 mt-0.5"
                  />
                  <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : ''}`}>
                    <span className="text-[9px] font-extrabold text-wood-900/40 mb-0.5">{msgAuthor.name}</span>
                    <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed break-all ${
                      isMe 
                        ? 'bg-engawa-600 text-white rounded-tr-none shadow-sm shadow-engawa-600/10' 
                        : 'bg-white/50 border border-white/40 text-wood-900 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-wood-900/30 font-medium mt-1">
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

      {/* Message Compose Form (bottom sticky overlay) */}
      <form onSubmit={handleSendMessage} className="relative z-10 w-full flex gap-2 items-center">
        <input
          type="text"
          required
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="返信を入力..."
          className="flex-1 glass-input rounded-2xl px-4 py-3 text-sm text-wood-900 placeholder:text-wood-900/30"
        />
        <button
          type="submit"
          className="w-11 h-11 rounded-full bg-engawa-600 hover:bg-engawa-700 text-white flex items-center justify-center shadow-md transition-all shrink-0 active:scale-95 border border-white/10"
        >
          <SendIcon size={18} />
        </button>
      </form>
    </div>
  );
};
