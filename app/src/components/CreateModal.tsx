import React, { useState, useEffect } from 'react';
import { ref, push, set, get } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PostIcon, PollIcon, CalendarIcon, CloseIcon } from './Icons';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultTab?: 'post' | 'poll' | 'event';
  initialDate?: string;
}

export const CreateModal: React.FC<CreateModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  defaultTab = 'post',
  initialDate = ''
}) => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'post' | 'poll' | 'event'>('post');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Post State
  const [postContent, setPostContent] = useState('');

  // 2. Poll State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // 3. Event State
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventStartTimeEnd] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [createLinkedPost, setCreateLinkedPost] = useState(true);

  // Set active tab and prefill date when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      if (initialDate) {
        setEventDate(initialDate);
      } else {
        setEventDate('');
      }
    }
  }, [isOpen, defaultTab, initialDate]);

  if (!isOpen) return null;

  const handleAddPollOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const createNotification = async (
    type: 'new_post' | 'new_poll' | 'new_event',
    title: string,
    body: string,
    linkPath: string
  ) => {
    if (!userProfile?.activeFamilyId || !currentUser) return;

    try {
      // Fetch all family members
      const familyMembersRef = ref(database, `families/${userProfile.activeFamilyId}/members`);
      const snapshot = await get(familyMembersRef);
      if (!snapshot.exists()) return;

      const membersMap = snapshot.val() as Record<string, boolean>;
      const targetUids: Record<string, boolean> = {};

      // Send to all family members EXCEPT the creator
      for (const uid in membersMap) {
        if (uid !== currentUser.uid) {
          targetUids[uid] = true;
        }
      }

      if (Object.keys(targetUids).length === 0) return; // Nobody to notify

      const queueRef = ref(database, 'notificationQueue');
      const newQueueItemRef = push(queueRef);
      const notifId = newQueueItemRef.key!;

      // 1. Enqueue to background push notification queue (server processes this)
      await set(newQueueItemRef, {
        id: notifId,
        familyId: userProfile.activeFamilyId,
        type,
        title,
        body,
        targetUids,
        linkPath,
        createdAt: Date.now(),
      });

      // 2. Write to in-app notification list for each target family member
      for (const targetUid in targetUids) {
        const userNotifRef = ref(database, `userNotifications/${targetUid}/${notifId}`);
        await set(userNotifRef, {
          id: notifId,
          title,
          body,
          linkPath,
          read: false,
          createdAt: Date.now()
        });
      }
    } catch (e) {
      console.error("Failed to enqueue notification:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile?.activeFamilyId) return;

    setError('');
    setLoading(true);

    try {
      const familyId = userProfile.activeFamilyId;

      if (activeTab === 'post') {
        if (!postContent.trim()) throw new Error('内容を入力してください');

        const postsRef = ref(database, `posts/${familyId}`);
        const newPostRef = push(postsRef);
        const postId = newPostRef.key!;

        const postData = {
          id: postId,
          authorId: currentUser.uid,
          authorName: userProfile.name,
          authorIcon: userProfile.icon || '',
          type: 'text',
          content: postContent.trim(),
          createdAt: Date.now(),
          participants: { [currentUser.uid]: true },
        };

        await set(newPostRef, postData);
        await createNotification('new_post', `${userProfile.name}さんの投稿`, postContent.trim().substring(0, 40), `/post/${postId}`);

      } else if (activeTab === 'poll') {
        if (!pollQuestion.trim()) throw new Error('質問を入力してください');
        const validOptions = pollOptions.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) throw new Error('投票の選択肢は2つ以上入力してください');

        const postsRef = ref(database, `posts/${familyId}`);
        const newPostRef = push(postsRef);
        const postId = newPostRef.key!;

        const formattedOptions: Record<string, any> = {};
        validOptions.forEach((opt, idx) => {
          const optionId = `opt_${idx}`;
          formattedOptions[optionId] = {
            id: optionId,
            text: opt.trim(),
          };
        });

        const postData = {
          id: postId,
          authorId: currentUser.uid,
          authorName: userProfile.name,
          authorIcon: userProfile.icon || '',
          type: 'poll',
          content: pollQuestion.trim(),
          createdAt: Date.now(),
          participants: { [currentUser.uid]: true },
          pollOptions: formattedOptions,
          pollClosed: false,
        };

        await set(newPostRef, postData);
        await createNotification('new_poll', `投票が開始されました`, pollQuestion.trim().substring(0, 40), `/post/${postId}`);

      } else if (activeTab === 'event') {
        if (!eventTitle.trim()) throw new Error('予定の名前を入力してください');
        if (!eventDate) throw new Error('日付を入力してください');

        const eventsRef = ref(database, `calendarEvents/${familyId}`);
        const newEventRef = push(eventsRef);
        const eventId = newEventRef.key!;

        let linkedPostId = '';
        if (createLinkedPost) {
          const postsRef = ref(database, `posts/${familyId}`);
          const newPostRef = push(postsRef);
          linkedPostId = newPostRef.key!;

          const postData = {
            id: linkedPostId,
            authorId: currentUser.uid,
            authorName: userProfile.name,
            authorIcon: userProfile.icon || '',
            type: 'calendar',
            content: `予定「${eventTitle.trim()}」が追加されました。\n日付: ${eventDate}\n${eventDesc ? `メモ: ${eventDesc}` : ''}`,
            createdAt: Date.now(),
            participants: { [currentUser.uid]: true },
            eventId: eventId,
          };
          await set(newPostRef, postData);
        }

        const eventData = {
          id: eventId,
          title: eventTitle.trim(),
          description: eventDesc.trim() || '',
          date: eventDate,
          startTime: eventStartTime || '',
          endTime: eventEndTime || '',
          authorId: currentUser.uid,
          linkedPostId: linkedPostId,
        };

        await set(newEventRef, eventData);
        await createNotification('new_event', `予定追加: ${eventTitle.trim()}`, `${eventDate} の予定です。`, linkedPostId ? `/post/${linkedPostId}` : `/`);
      }

      // Reset Form State
      setPostContent('');
      setPollQuestion('');
      setPollOptions(['', '']);
      setEventTitle('');
      setEventDate('');
      setEventStartTime('');
      setEventStartTimeEnd('');
      setEventDesc('');
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || '作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-wood-900/10 backdrop-blur-xs animate-gentleFadeIn" onClick={onClose} />

      {/* Dialog box */}
      <div className="relative z-10 w-full max-w-md bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-gentleSlideUp">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold tracking-widest text-lg text-engawa-800 font-soft">新しい作成</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-wood-900/5 text-wood-900/40">
            <CloseIcon size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50/70 border border-red-200/50 text-red-800 text-xs px-4 py-2.5 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex bg-wood-900/5 p-1 rounded-2xl border border-white/20">
          <button
            onClick={() => setActiveTab('post')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'post' ? 'bg-white text-engawa-700 shadow-sm' : 'text-wood-900/50'
            }`}
          >
            <PostIcon size={16} />
            投稿
          </button>
          <button
            onClick={() => setActiveTab('poll')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'poll' ? 'bg-white text-engawa-700 shadow-sm' : 'text-wood-900/50'
            }`}
          >
            <PollIcon size={16} />
            投票
          </button>
          <button
            onClick={() => setActiveTab('event')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'event' ? 'bg-white text-engawa-700 shadow-sm' : 'text-wood-900/50'
            }`}
          >
            <CalendarIcon size={16} />
            予定
          </button>
        </div>

        {/* Forms */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* TAB 1: POST FORM */}
          {activeTab === 'post' && (
            <div className="flex flex-col gap-1">
              <textarea
                required
                rows={4}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="縁側に書き残したい出来事、つぶやきなどをどうぞ..."
                className="w-full glass-input rounded-2xl px-4 py-3 text-base text-wood-900 placeholder:text-wood-900/30 resize-none"
              />
            </div>
          )}

          {/* TAB 2: POLL FORM */}
          {activeTab === 'poll' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  required
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="みんなに聞いてみたいこと（例: 夕飯何がいい？）"
                  className="w-full glass-input rounded-2xl px-4 py-3 text-base text-wood-900 placeholder:text-wood-900/30"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-engawa-800 tracking-wider">選択肢</label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required={idx < 2}
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      placeholder={`選択肢 ${idx + 1}`}
                      className="flex-1 glass-input rounded-xl px-3.5 py-2.5 text-base text-wood-900 placeholder:text-wood-900/30"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(idx)}
                        className="text-red-500 hover:text-red-700 font-bold text-lg px-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-left text-xs font-bold text-engawa-600 hover:text-engawa-700 mt-1"
                >
                  + 選択肢を追加
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: EVENT FORM */}
          {activeTab === 'event' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-engawa-800 tracking-wider">予定の名前</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="例: たろうの誕生日会"
                  className="w-full glass-input rounded-2xl px-4 py-3 text-base text-wood-900 placeholder:text-wood-900/30"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-engawa-800 tracking-wider">日付</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full glass-input rounded-xl px-2.5 py-2.5 text-sm text-wood-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-engawa-800 tracking-wider">開始（任意）</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full glass-input rounded-xl px-2 py-2.5 text-sm text-center text-wood-900"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-engawa-800 tracking-wider">終了（任意）</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventStartTimeEnd(e.target.value)}
                    className="w-full glass-input rounded-xl px-2 py-2.5 text-sm text-center text-wood-900"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-engawa-800 tracking-wider">メモ（任意）</label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="持ち物や場所など..."
                  className="w-full glass-input rounded-2xl px-4 py-3 text-base text-wood-900 placeholder:text-wood-900/30 resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-1 select-none">
                <input
                  type="checkbox"
                  checked={createLinkedPost}
                  onChange={(e) => setCreateLinkedPost(e.target.checked)}
                  className="accent-engawa-600 rounded"
                />
                <span className="text-xs font-bold text-wood-900/70">この予定について縁側で話を始める</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-engawa-600 hover:bg-engawa-700 disabled:opacity-50 text-white font-bold tracking-wider shadow-lg shadow-engawa-600/15 hover:shadow-engawa-600/25 transition-all font-soft"
          >
            {loading ? '作成中...' : '作成する'}
          </button>
        </form>
      </div>
    </div>
  );
};
