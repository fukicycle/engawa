import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, off, set, get } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { LeafBackground } from '../components/LeafBackground';
import { Navigation } from '../components/Navigation';
import { CreateModal } from '../components/CreateModal';
import { 
  HomeIcon, 
  LogOutIcon, 
  LeafIcon 
} from '../components/Icons';
import type { Post, CalendarEvent, UserProfile, FamilyGroup } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'settings'>('home');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Data States
  const [family, setFamily] = useState<FamilyGroup | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Record<string, UserProfile>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (userProfile && !userProfile.familyId) {
      navigate('/setup-family');
      return;
    }
  }, [currentUser, userProfile]);

  useEffect(() => {
    if (!userProfile?.familyId) return;

    const familyId = userProfile.familyId;

    // 1. Listen to Family Info
    const familyRef = ref(database, `families/${familyId}`);
    onValue(familyRef, async (snapshot) => {
      if (snapshot.exists()) {
        const familyData = snapshot.val() as FamilyGroup;
        setFamily(familyData);

        // Fetch user profiles for all members in parallel
        const memberIds = Object.keys(familyData.members || {});
        const profiles: Record<string, UserProfile> = {};
        await Promise.all(
          memberIds.map(async (uid) => {
            const userSnapshot = await get(ref(database, `users/${uid}`));
            if (userSnapshot.exists()) {
              profiles[uid] = userSnapshot.val() as UserProfile;
            }
          })
        );
        setFamilyMembers(profiles);
      }
    });

    // 2. Listen to Posts
    const postsRef = ref(database, `posts/${familyId}`);
    onValue(postsRef, (snapshot) => {
      if (snapshot.exists()) {
        const postsData = snapshot.val();
        const postsList: Post[] = Object.keys(postsData).map((key) => ({
          ...postsData[key],
          id: key,
        }));
        // Sort reverse chronological
        postsList.sort((a, b) => b.createdAt - a.createdAt);
        setPosts(postsList);
      } else {
        setPosts([]);
      }
    });

    // 3. Listen to Calendar Events
    const eventsRef = ref(database, `calendarEvents/${familyId}`);
    onValue(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const eventsData = snapshot.val();
        const eventsList: CalendarEvent[] = Object.keys(eventsData).map((key) => ({
          ...eventsData[key],
          id: key,
        }));
        setEvents(eventsList);
      } else {
        setEvents([]);
      }
    });

    return () => {
      off(familyRef);
      off(postsRef);
      off(eventsRef);
    };
  }, [userProfile?.familyId]);

  const handleVote = async (postId: string, optionId: string) => {
    if (!currentUser || !userProfile?.familyId) return;
    const voteRef = ref(
      database,
      `posts/${userProfile.familyId}/${postId}/pollOptions/${optionId}/votes/${currentUser.uid}`
    );
    
    // Toggle vote: check if already voted
    const snapshot = await get(voteRef);
    if (snapshot.exists() && snapshot.val() === true) {
      await set(voteRef, null); // remove vote
    } else {
      await set(voteRef, true); // add vote
    }
  };

  const handleCopyInviteCode = () => {
    if (!family?.inviteCode) return;
    navigator.clipboard.writeText(family.inviteCode);
    alert('招待コードをクリップボードにコピーしました！');
  };

  // Calendar Helper: Get events of selected date
  const selectedDateEvents = events.filter((ev) => ev.date === selectedDate);

  // Calendar Grid Generator
  const renderCalendarGrid = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // Current Month (0-11)
    
    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // First day of month index (0: Sun, 1: Mon, etc.)
    const firstDayIndex = new Date(year, month, 1).getDay();

    const days = [];
    // Blank spots for days of previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`blank-${i}`} className="h-10 w-10"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = dateString === selectedDate;
      const hasEvents = events.some((ev) => ev.date === dateString);
      const isToday = today.toISOString().split('T')[0] === dateString;

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(dateString)}
          className={`h-9 w-9 rounded-full flex flex-col items-center justify-center relative text-xs font-bold transition-all ${
            isSelected 
              ? 'bg-engawa-600 text-white shadow shadow-engawa-600/30 scale-105' 
              : isToday
                ? 'bg-engawa-100 text-engawa-800'
                : 'text-wood-900 hover:bg-white/40'
          }`}
        >
          {day}
          {hasEvents && !isSelected && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-engawa-500"></span>
          )}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="relative min-h-screen pb-24 pt-4 px-4 overflow-hidden max-w-md mx-auto flex flex-col gap-5">
      <LeafBackground />

      {/* Elegant Washi / Shoji Header */}
      <header className="relative z-10 w-full glass rounded-2xl px-5 py-4 flex items-center justify-between border border-white/40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-engawa-500/10 flex items-center justify-center text-engawa-600 border border-engawa-500/15">
            <HomeIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-widest text-engawa-800 font-soft">縁側</h1>
            <p className="text-[10px] tracking-widest text-wood-900/50 font-bold">
              {family ? `${family.name}` : '読み込み中...'}
            </p>
          </div>
        </div>

        {/* Info card display for PWA notifications trigger or profile */}
        <div className="flex items-center gap-2">
          {family?.inviteCode && (
            <button
              onClick={handleCopyInviteCode}
              className="text-[10px] bg-white/50 border border-white/60 hover:bg-white/80 px-2.5 py-1.5 rounded-xl font-bold tracking-wider text-engawa-700 transition-colors"
            >
              コード: {family.inviteCode}
            </button>
          )}
        </div>
      </header>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="relative z-10 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] hide-scrollbar">
        
        {/* SUBVIEW A: HOME (THREADS LIST) */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-4">
            {posts.length === 0 ? (
              <div className="glass-card rounded-3xl p-8 text-center flex flex-col items-center gap-3 text-wood-900/40">
                <LeafIcon size={40} className="opacity-30" />
                <p className="text-xs font-bold tracking-wider">縁側は静かです。<br />新しい会話を始めてみましょう。</p>
              </div>
            ) : (
              posts.map((post) => {
                const author = familyMembers[post.authorId] || { name: post.authorName, icon: post.authorIcon };
                const date = new Date(post.createdAt).toLocaleDateString('ja-JP', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="glass-card rounded-3xl p-5 border border-white/40 shadow-sm flex flex-col gap-3 hover:bg-white/30 cursor-pointer transition-all active:scale-[0.99] group"
                  >
                    {/* Author & Timestamp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={author.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.authorId}`}
                          alt={author.name}
                          className="w-8 h-8 rounded-full border border-white/30 bg-white/50"
                        />
                        <div>
                          <h4 className="text-xs font-extrabold text-engawa-800">{author.name}</h4>
                          <p className="text-[9px] text-wood-900/40 font-medium">{date}</p>
                        </div>
                      </div>

                      {/* Type Badge */}
                      <span className="text-[9px] font-bold tracking-widest px-2 py-1 rounded-lg bg-white/40 border border-white/50 text-engawa-600">
                        {post.type === 'poll' ? '投票' : post.type === 'calendar' ? 'カレンダー' : '井戸端'}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-sm leading-relaxed text-wood-900/80 font-medium break-all whitespace-pre-line">
                      {post.content}
                    </p>

                    {/* Poll Special UI */}
                    {post.type === 'poll' && post.pollOptions && (
                      <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/30 border border-white/40 mt-1" onClick={(e) => e.stopPropagation()}>
                        {Object.values(post.pollOptions).map((opt) => {
                          const votesMap = opt.votes || {};
                          const voteCount = Object.keys(votesMap).length;
                          const hasVoted = currentUser ? votesMap[currentUser.uid] === true : false;
                          
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleVote(post.id, opt.id)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all relative overflow-hidden ${
                                hasVoted
                                  ? 'bg-engawa-600/10 border-engawa-600/30 text-engawa-800'
                                  : 'bg-white/40 border-white/50 hover:bg-white/60 text-wood-900/70'
                              }`}
                            >
                              <span>{opt.text}</span>
                              <span className="bg-white/60 px-2 py-0.5 rounded-md border border-white text-[10px]">
                                {voteCount} 票
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Footer Stats / Interaction trigger info */}
                    <div className="flex items-center justify-between border-t border-wood-900/5 pt-2 text-[10px] text-wood-900/40 font-bold mt-1">
                      <span className="hover:text-engawa-600 transition-colors">
                        チャットに参加する →
                      </span>
                      <span>返信・リアクション</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SUBVIEW B: CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="flex flex-col gap-4">
            
            {/* Elegant Calendar Card */}
            <div className="glass-card rounded-3xl p-5 border border-white/40 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-wood-900/5 pb-2">
                <h3 className="text-sm font-extrabold tracking-widest text-engawa-800">
                  {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                </h3>
                <span className="text-[10px] font-bold text-wood-900/40">家族カレンダー</span>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-wood-900/40">
                <span className="text-red-400">日</span>
                <span>月</span>
                <span>火</span>
                <span>水</span>
                <span>木</span>
                <span>金</span>
                <span className="text-blue-400">土</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 justify-items-center">
                {renderCalendarGrid()}
              </div>
            </div>

            {/* Event Agenda Card for Selected Date */}
            <div className="glass-card rounded-3xl p-5 border border-white/40 shadow-sm flex flex-col gap-3">
              <h3 className="text-xs font-extrabold text-engawa-800 tracking-wider">
                {selectedDate.replace('-', '年').replace('-', '月') + '日'} の予定
              </h3>

              {selectedDateEvents.length === 0 ? (
                <p className="text-xs text-wood-900/40 font-bold py-4 text-center">この日の予定はありません。</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedDateEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => ev.linkedPostId && navigate(`/post/${ev.linkedPostId}`)}
                      className={`p-3 rounded-2xl border border-white/40 bg-white/30 text-left ${
                        ev.linkedPostId ? 'cursor-pointer hover:bg-white/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-engawa-800">{ev.title}</h4>
                        {ev.startTime && (
                          <span className="text-[9px] font-bold bg-white/60 border border-white/50 text-engawa-600 px-2 py-0.5 rounded-md">
                            {ev.startTime} {ev.endTime ? `~ ${ev.endTime}` : ''}
                          </span>
                        )}
                      </div>
                      {ev.description && (
                        <p className="text-[11px] text-wood-900/60 mt-1">{ev.description}</p>
                      )}
                      {ev.linkedPostId && (
                        <div className="text-[9px] font-extrabold text-engawa-600 mt-2 hover:underline">
                          → 縁側での話を見る
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBVIEW C: SETTINGS & MEMBERS */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-4">
            
            {/* Profile Detail */}
            <div className="glass-card rounded-3xl p-5 border border-white/40 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={userProfile?.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.uid}`}
                  alt={userProfile?.name}
                  className="w-12 h-12 rounded-full border border-white/30 bg-white/50"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-engawa-800">{userProfile?.name}</h3>
                  <p className="text-[10px] text-wood-900/40">{currentUser?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-10 h-10 rounded-full hover:bg-red-500/10 hover:text-red-600 text-wood-900/40 flex items-center justify-center transition-colors"
              >
                <LogOutIcon size={20} />
              </button>
            </div>

            {/* Family Members List */}
            <div className="glass-card rounded-3xl p-5 border border-white/40 shadow-sm flex flex-col gap-3">
              <h3 className="text-xs font-extrabold text-engawa-800 tracking-wider">
                {family?.name || '家族'} のメンバー
              </h3>

              <div className="flex flex-col gap-2.5">
                {Object.values(familyMembers).map((member) => (
                  <div key={member.uid} className="flex items-center gap-3 p-2 bg-white/20 border border-white/30 rounded-2xl">
                    <img
                      src={member.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.uid}`}
                      alt={member.name}
                      className="w-8 h-8 rounded-full border border-white/30 bg-white/50"
                    />
                    <span className="text-xs font-bold text-wood-900/80">{member.name}</span>
                    {member.uid === currentUser?.uid && (
                      <span className="text-[8px] font-bold bg-engawa-100 text-engawa-700 border border-engawa-500/10 px-1.5 py-0.5 rounded ml-auto">
                        自分
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invitation Code Card */}
            <div className="glass-card rounded-3xl p-5 border border-white/40 shadow-sm flex flex-col gap-3 text-center">
              <h3 className="text-xs font-extrabold text-engawa-800 tracking-wider">家族の追加</h3>
              <p className="text-[11px] text-wood-900/60 leading-relaxed px-2">
                まだ縁側にいない家族を招待しましょう。<br />このコードを教えて「招待コードで参加」からログインしてもらいます。
              </p>
              <div className="bg-white/40 border border-white/50 rounded-2xl py-3 px-6 mt-1 flex items-center justify-center gap-3">
                <span className="text-lg font-mono font-extrabold tracking-widest text-engawa-800">
                  {family?.inviteCode}
                </span>
                <button
                  onClick={handleCopyInviteCode}
                  className="text-xs font-extrabold text-engawa-600 hover:text-engawa-700 bg-white border border-white px-2.5 py-1.5 rounded-xl shadow-sm"
                >
                  コピー
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Nav bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onPlusClick={() => setIsCreateOpen(true)}
      />

      {/* Create Event/Post Modal */}
      <CreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          setActiveTab('home'); // go back to threads
        }}
      />
    </div>
  );
};
