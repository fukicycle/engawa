import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, off, set, get } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { LeafBackground } from '../components/LeafBackground';
import { Navigation } from '../components/Navigation';
import { CreateModal } from '../components/CreateModal';
import { Dialog } from '../components/Dialog';
import { LoadingScreen } from '../components/LoadingScreen';
import { ReleaseNoteModal } from '../components/ReleaseNoteModal';
import releaseNotes from '../assets/release-notes.json';
import { 
  HomeIcon, 
  LogOutIcon, 
  LeafIcon,
  BellIcon,
  CheckIcon
} from '../components/Icons';
import { decryptText } from '../utils/crypto';
import type { Post, CalendarEvent, UserProfile, FamilyGroup } from '../types';
import { usePushNotifications } from '../hooks/usePushNotifications';

const formatLastReplyTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  return `${days}日前`;
};

const getBodyTextClass = (_size: 'small' | 'normal' | 'large') => {
  return 'text-sm leading-relaxed font-medium'; // Dynamically scaled by root HTML font-size!
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, logout, fontSize, changeFontSize, switchFamily } = useAuth();
  const { permission: pushPermission, subscribeUser } = usePushNotifications();
  
  // PWA update states
  const [autoUpdate, setAutoUpdate] = useState<boolean>(() => {
    return localStorage.getItem('engawa_auto_update') !== 'false'; // default true
  });
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isReleaseNoteOpen, setIsReleaseNoteOpen] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('庭をひらいています...');

  // Check if version was upgraded to show release notes
  useEffect(() => {
    const lastViewedVersion = localStorage.getItem('engawa_viewed_version');
    if (lastViewedVersion !== releaseNotes.version) {
      setIsReleaseNoteOpen(true);
    }
  }, []);

  const handleCloseReleaseNote = () => {
    setIsReleaseNoteOpen(false);
    localStorage.setItem('engawa_viewed_version', releaseNotes.version);
  };

  // PWA update and lifecycle listener
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let progressInterval: any;

    // Helper to monitor the new worker state
    const monitorStateAndTrigger = (registration: ServiceWorkerRegistration) => {
      const waitingWorker = registration.waiting;
      if (!waitingWorker) return;

      if (autoUpdate) {
        setIsApplyingUpdate(true);
        setLoadingMessage('新しいアップデートを自動適用中...');

        let step = 1;
        progressInterval = setInterval(() => {
          if (step === 1) {
            setLoadingMessage('古いお便りを整理しています (30%)...');
          } else if (step === 2) {
            setLoadingMessage('新しいお庭をひらいています (70%)...');
          } else {
            clearInterval(progressInterval);
            setLoadingMessage('再起動中...');
            window.location.reload();
          }
          step++;
        }, 1000);

        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      } else {
        setUpdateRegistration(registration);
      }
    };

    navigator.serviceWorker.ready.then((registration) => {
      // Listen for incoming installations
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              monitorStateAndTrigger(registration);
            }
          });
        }
      });

      // Check if there is already a waiting service worker
      if (registration.waiting) {
        monitorStateAndTrigger(registration);
      }
    });

    // Handle instant page reload once skipWaiting executes
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      if (progressInterval) clearInterval(progressInterval);
      setLoadingMessage('再起動中...');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [autoUpdate]);

  const handleCheckUpdateManually = async () => {
    if (!('serviceWorker' in navigator)) {
      setDialogTitle('アップデートの確認');
      setDialogMessage('お使いの環境はPWAアップデートに対応していません。');
      setDialogOpen(true);
      return;
    }

    setIsCheckingUpdate(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();

      // Wait a brief moment for update found to trigger or detect waiting
      setTimeout(() => {
        setIsCheckingUpdate(false);
        if (registration.waiting) {
          setUpdateRegistration(registration);
          setDialogTitle('アップデートの確認');
          setDialogMessage('新しい更新が見つかりました。手動でアップデートを実行します。');
          setDialogOpen(true);
        } else {
          setDialogTitle('アップデートの確認');
          setDialogMessage('現在、縁側は最新の状態（' + releaseNotes.version + '）です。');
          setDialogOpen(true);
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsCheckingUpdate(false);
      setDialogTitle('エラー');
      setDialogMessage('アップデートの確認に失敗しました。時間をおいて再度お試しください。');
      setDialogOpen(true);
    }
  };

  const handleApplyManualUpdate = () => {
    if (updateRegistration && updateRegistration.waiting) {
      setIsApplyingUpdate(true);
      setLoadingMessage('最新のファイルを適用中...');

      let step = 1;
      const progressInterval = setInterval(() => {
        if (step === 1) {
          setLoadingMessage('古いファイルを整理しています (25%)...');
        } else if (step === 2) {
          setLoadingMessage('新しいお庭を整えています (60%)...');
        } else if (step === 3) {
          setLoadingMessage('仕上げを行っています (90%)...');
        } else {
          clearInterval(progressInterval);
          setLoadingMessage('まもなく再起動します...');
          window.location.reload();
        }
        step++;
      }, 800);

      updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleUpdateEventDate = async () => {
    if (!selectedDetailEvent || !editEventDate || !userProfile?.activeFamilyId) return;

    try {
      const familyId = userProfile.activeFamilyId;
      const eventRef = ref(database, `calendarEvents/${familyId}/${selectedDetailEvent.id}`);
      
      await set(eventRef, {
        ...selectedDetailEvent,
        date: editEventDate
      });

      setIsEventDetailOpen(false);
      setDialogTitle('日付の変更');
      setDialogMessage('予定の日付を変更しました！');
      setDialogOpen(true);
    } catch (err) {
      console.error(err);
      setDialogTitle('エラー');
      setDialogMessage('日付の変更に失敗しました。');
      setDialogOpen(true);
    }
  };

  useEffect(() => {
    if (selectedDetailEvent) {
      setEditEventDate(selectedDetailEvent.date);
    }
  }, [selectedDetailEvent]);

  const handleToggleAutoUpdate = (checked: boolean) => {
    setAutoUpdate(checked);
    localStorage.setItem('engawa_auto_update', String(checked));
  };

  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'settings'>('home');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'post' | 'poll' | 'event'>('post');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showNotificationGuide, setShowNotificationGuide] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);

  // Family Switcher States
  const [isFamilySwitcherOpen, setIsFamilySwitcherOpen] = useState(false);
  const [userFamiliesList, setUserFamiliesList] = useState<Array<{id: string, name: string}>>([]);

  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  // Data States
  const [family, setFamily] = useState<FamilyGroup | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Record<string, UserProfile>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Event Detail Dialog States
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<CalendarEvent | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [editEventDate, setEditEventDate] = useState('');

  // Unread posts and in-app Notification States
  const [readPosts, setReadPosts] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<Record<string, any>>({});
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  const unreadNotifCount = Object.values(notifications).filter(n => !n.read).length;

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (userProfile && !userProfile.activeFamilyId) {
      navigate('/setup-family');
      return;
    }
  }, [currentUser, userProfile]);

  // Listen for unlinked eventId in query parameters for direct detail modal opening
  useEffect(() => {
    if (!currentUser || !userProfile?.activeFamilyId) return;

    const parseAndOpenEvent = async () => {
      const hash = window.location.hash;
      const queryIdx = hash.indexOf('?');
      if (queryIdx !== -1) {
        const params = new URLSearchParams(hash.substring(queryIdx));
        const eventId = params.get('eventId');
        if (eventId) {
          try {
            const familyId = userProfile.activeFamilyId;
            const eventSnapshot = await get(ref(database, `calendarEvents/${familyId}/${eventId}`));
            if (eventSnapshot.exists()) {
              const eventData = eventSnapshot.val() as CalendarEvent;
              setSelectedDetailEvent(eventData);
              setIsEventDetailOpen(true);
              setActiveTab('calendar'); // Switch to calendar tab so they see it in context!
              
              // Clear the eventId query parameter from hash so it doesn't reopen on every mount/hash change
              const cleanHash = hash.substring(0, queryIdx);
              navigate(cleanHash, { replace: true });
            }
          } catch (err) {
            console.error("Failed to parse and open unlinked event:", err);
          }
        }
      }
    };

    parseAndOpenEvent();
  }, [currentUser, userProfile?.activeFamilyId, window.location.hash, navigate]);

  useEffect(() => {
    if (!userProfile?.activeFamilyId || !currentUser) return;

    const familyId = userProfile.activeFamilyId;
    const uid = currentUser.uid;

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
        // Sort based on the latest activity: maximum of lastReplyAt and createdAt (Teams / Slack style)
        postsList.sort((a, b) => {
          const timeA = a.lastReplyAt ? Math.max(a.lastReplyAt, a.createdAt) : a.createdAt;
          const timeB = b.lastReplyAt ? Math.max(b.lastReplyAt, b.createdAt) : b.createdAt;
          return timeB - timeA;
        });
        setPosts(postsList);
      } else {
        setPosts([]);
      }
      setPostsLoading(false);
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

    // 4. Listen to User's Unread Posts Log
    const readPostsRef = ref(database, `users/${uid}/readPosts`);
    onValue(readPostsRef, (snapshot) => {
      if (snapshot.exists()) {
        setReadPosts(snapshot.val());
      } else {
        setReadPosts({});
      }
    });

    // 5. Listen to User's In-App Notifications
    const notificationsRef = ref(database, `userNotifications/${uid}`);
    onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        setNotifications(snapshot.val());
      } else {
        setNotifications({});
      }
    });

    return () => {
      off(familyRef);
      off(postsRef);
      off(eventsRef);
      off(readPostsRef);
      off(notificationsRef);
    };
  }, [userProfile?.activeFamilyId, currentUser?.uid]);

  // Modern PWA Native App Icon Badging API (Updates Dock/Launcher Badge Count)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      try {
        if (unreadNotifCount > 0) {
          (navigator as any).setAppBadge(unreadNotifCount);
        } else {
          (navigator as any).clearAppBadge();
        }
      } catch (error) {
        console.error('Failed to update PWA home icon badge:', error);
      }
    }
  }, [unreadNotifCount]);

  // Load and resolve the names of all the user's families for the switcher
  useEffect(() => {
    if (!userProfile?.families) return;
    
    const familyIds = Object.keys(userProfile.families);
    
    const fetchNames = async () => {
      try {
        const list: Array<{id: string, name: string}> = [];
        for (const fid of familyIds) {
          const snap = await get(ref(database, `families/${fid}/name`));
          if (snap.exists()) {
            list.push({ id: fid, name: snap.val() as string });
          }
        }
        setUserFamiliesList(list);
      } catch (err) {
        console.error("Failed to fetch family names:", err);
      }
    };
    
    fetchNames();
  }, [userProfile?.families]);

  const handleVote = async (postId: string, optionId: string) => {
    if (!currentUser || !userProfile?.activeFamilyId) return;
    const voteRef = ref(
      database,
      `posts/${userProfile.activeFamilyId}/${postId}/pollOptions/${optionId}/votes/${currentUser.uid}`
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
    setDialogTitle('設定');
    setDialogMessage('招待コードをコピーしました！家族に教えてあげてください。');
    setDialogOpen(true);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter events that are today or in the future
  const futureEvents = events
    .filter((ev) => ev.date >= todayStr)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    // Find the first event on or after selected date
    const targetEvent = futureEvents.find((ev) => ev.date >= dateString);
    if (targetEvent) {
      const el = document.getElementById(`event-card-${targetEvent.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  // Advanced Pre-rendered Multi-Month Carousel Touch Swiping Logic
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionIndex, setTransitionIndex] = useState(0); // -1: prev, 0: current, 1: next

  const goToPrevMonth = () => {
    if (isTransitioning) return;
    setTransitionIndex(-1);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
      setTransitionIndex(0);
      setIsTransitioning(false);
    }, 300);
  };

  const goToNextMonth = () => {
    if (isTransitioning) return;
    setTransitionIndex(1);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
      setTransitionIndex(0);
      setIsTransitioning(false);
    }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || touchStart === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStart;
    // Compress movement slightly for fluid visual damping
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isSwiping || touchStart === null) return;
    setIsSwiping(false);

    const threshold = 60; // swipe threshold in pixels
    if (swipeOffset > threshold) {
      // Swipe right -> Prev Month
      setTransitionIndex(-1);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setTransitionIndex(0);
        setIsTransitioning(false);
      }, 300);
    } else if (swipeOffset < -threshold) {
      // Swipe left -> Next Month
      setTransitionIndex(1);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setTransitionIndex(0);
        setIsTransitioning(false);
      }, 300);
    } else {
      // Bounce back to middle
      setTransitionIndex(0);
      setIsTransitioning(true);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
    setSwipeOffset(0);
    setTouchStart(null);
  };

  // Calendar Grid Generator for Specific Base Date
  const renderCalendarGridForDate = (baseDate: Date) => {
    const today = new Date();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth(); // Active Month (0-11)
    
    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // First day of month index (0: Sun, 1: Mon, etc.)
    const firstDayIndex = new Date(year, month, 1).getDay();

    const days = [];
    // Blank spots for days of previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`blank-${i}`} className="h-8 w-8"></div>);
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
          onClick={() => handleDateSelect(dateString)}
          className={`h-8 w-8 rounded-full flex flex-col items-center justify-center relative text-xs font-bold transition-all ${
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

  if (isApplyingUpdate) {
    return <LoadingScreen message={loadingMessage} />;
  }

  if (!family) {
    return <LoadingScreen message="庭をひらいています..." />;
  }

  return (
    <div className="relative h-dvh overflow-hidden pt-4 px-4 pb-0 max-w-md mx-auto flex flex-col gap-3 animate-gentleSlideUp">
      <LeafBackground />

      {/* Elegant Washi / Shoji Header */}
      <header className="relative z-10 w-full glass rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm">
        <div 
          onClick={() => setIsFamilySwitcherOpen(true)}
          className="flex items-center gap-3 cursor-pointer select-none group"
          title="家族を切り替える"
        >
          <div className="w-10 h-10 rounded-full bg-engawa-500/10 flex items-center justify-center text-engawa-600 border border-engawa-500/15 group-hover:scale-105 transition-all">
            <HomeIcon size={20} />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-widest text-engawa-800 font-soft flex items-center gap-1">
              <span>縁側</span>
              <span className="text-[9px] text-wood-900/30 group-hover:text-engawa-600 transition-colors">▼</span>
              <span className="text-[8px] font-mono font-medium text-wood-900/30 ml-1 select-none">{releaseNotes.version}</span>
            </h1>
            <p className="text-[10px] tracking-widest text-wood-900/80 font-bold truncate max-w-[120px]">
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

          {/* Elegant Wind-chime / Notification Bell Button with gentle water ripple highlights (no numbers) */}
          <button
            onClick={() => setIsNotificationDrawerOpen(true)}
            className={`w-9 h-9 rounded-full bg-white/50 hover:bg-white/80 border text-engawa-600 flex items-center justify-center relative transition-all active:scale-95 shadow-sm ${
              unreadNotifCount > 0 
                ? 'animate-pingRing border-engawa-500/50 shadow-md shadow-engawa-500/10' 
                : 'border-white/60'
            }`}
            title="通知一覧"
          >
            <BellIcon size={18} />
            {unreadNotifCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="relative z-10 flex-1 flex flex-col gap-2.5 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+80px)] hide-scrollbar min-h-0">
        
        {/* SUBVIEW A: HOME (THREADS LIST) */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-4 animate-gentleSlideUp">
            
            {/* Dynamic Notification Permission Guide */}
            {pushPermission === 'default' && showNotificationGuide && (
              <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-engawa-500/10 flex items-center justify-center text-engawa-600 shrink-0">
                    <BellIcon size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-engawa-800">通知を有効にしませんか？</h4>
                    <p className="text-[10px] text-wood-900/90 leading-relaxed mt-1">
                      家族からの新しい「投稿」や「あなたへの返信」を、アプリを閉じていてもリアルタイムにお届けします。関係のないチャットの通知は届かないので静かです。
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <button
                    onClick={() => setShowNotificationGuide(false)}
                    className="text-[9px] font-bold text-wood-900/75 px-3 py-1.5 rounded-xl hover:bg-wood-900/5"
                  >
                    また今度
                  </button>
                  <button
                    onClick={subscribeUser}
                    className="text-[9px] font-bold text-white bg-engawa-600 hover:bg-engawa-700 px-4 py-1.5 rounded-xl shadow shadow-engawa-600/10"
                  >
                    通知を許可する
                  </button>
                </div>
              </div>
            )}

            {postsLoading ? (
              // Beautiful Skeleton Cards with left-to-right shimmer glow!
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="glass-card rounded-2xl p-4 flex flex-col gap-4 overflow-hidden relative">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full skeleton-shimmer shrink-0" />
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="w-24 h-3 rounded skeleton-shimmer" />
                        <div className="w-16 h-2 rounded skeleton-shimmer" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2.5 mt-1">
                      <div className="w-full h-4 rounded skeleton-shimmer" />
                      <div className="w-5/6 h-4 rounded skeleton-shimmer" />
                    </div>
                    <div className="border-t border-wood-900/5 pt-2.5 mt-2 flex justify-between">
                      <div className="w-16 h-3 rounded skeleton-shimmer" />
                      <div className="w-20 h-3 rounded skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="glass-card rounded-3xl p-8 text-center flex flex-col items-center gap-3 text-wood-900/75">
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
                const isUnread = !readPosts[post.id] || (post.lastReplyAt ? post.lastReplyAt > readPosts[post.id] : post.createdAt > readPosts[post.id]);

                return (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/post/${post.id}`)}
                    className={`glass-card rounded-2xl p-4 shadow-sm flex flex-col gap-3 hover:bg-white/30 cursor-pointer transition-all active:scale-[0.99] group ${
                      isUnread
                        ? 'border-engawa-500/40 ring-1 ring-engawa-500/10 shadow shadow-engawa-500/5'
                        : ''
                    }`}
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
                          <p className="text-xs text-wood-900/80 font-bold">
                            {date}
                            {post.edited && (
                              <span className="text-wood-900/30 font-bold ml-1 text-[8px] bg-wood-900/5 px-1 py-0.5 rounded-md">編集済</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Type Badge & Unread Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isUnread && (
                          <span className="text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded bg-red-500 text-white animate-pulse">新着</span>
                        )}
                        <span className="text-[9px] font-bold tracking-widest px-2 py-1 rounded-lg bg-white/40 border border-white/50 text-engawa-600">
                          {post.type === 'poll' ? '投票' : post.type === 'calendar' ? 'カレンダー' : '井戸端'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <p className={`font-medium break-all whitespace-pre-line text-wood-900 ${getBodyTextClass(fontSize)}`}>
                      {decryptText(post.content)}
                    </p>

                    {/* Calendar Linked Post Card details */}
                    {post.type === 'calendar' && post.eventId && (() => {
                      const linkedEvent = events.find(ev => ev.id === post.eventId);
                      if (!linkedEvent) return null;
                      return (
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-wood-50/70 border border-wood-200/50 mt-1">
                          {/* Small Tear-off Japanese Calendar sheet */}
                          <div className="w-11 h-12 bg-white rounded-lg border border-wood-300 shadow-sm flex flex-col items-center overflow-hidden shrink-0">
                            <div className="w-full bg-red-500 text-white text-[8px] font-bold py-0.5 text-center tracking-widest">
                              {linkedEvent.date.split('-')[1]}月
                            </div>
                            <div className="text-wood-900 font-extrabold text-base leading-none mt-1">
                              {parseInt(linkedEvent.date.split('-')[2])}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-extrabold text-engawa-800 truncate">{decryptText(linkedEvent.title)}</h5>
                            <p className="text-[9px] text-wood-900/80 font-bold mt-0.5">
                              {linkedEvent.startTime ? `${linkedEvent.startTime}${linkedEvent.endTime ? ` ~ ${linkedEvent.endTime}` : ''}` : '終日'}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

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
                              <span>{decryptText(opt.text)}</span>
                              <span className="bg-white/60 px-2 py-0.5 rounded-md border border-white text-[10px]">
                                {voteCount} 票
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Footer Stats / Interaction trigger info */}
                    <div className="flex items-center justify-between border-t border-wood-900/5 pt-2 text-xs text-wood-900/85 font-bold mt-1">
                      <div className="flex items-center gap-1 hover:text-engawa-600 transition-colors">
                        <span>💬</span>
                        <span>
                          {post.replyCount 
                            ? `やり取り: ${post.replyCount}件` 
                            : 'まだやり取りはありません'}
                        </span>
                      </div>
                      <span>
                        {post.lastReplyAt 
                          ? `最後: ${formatLastReplyTime(post.lastReplyAt)}` 
                          : 'のんびり話しましょう'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SUBVIEW B: CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="flex-1 flex flex-col gap-3.5 animate-gentleSlideUp min-h-0 overflow-hidden">
            
            {/* Elegant Calendar Card with Smooth Pre-rendered Horizontal Swipe Carousel */}
            <div 
              className="glass-card rounded-2xl p-3 shadow-sm flex flex-col gap-2.5 select-none touch-pan-y shrink-0 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-wood-900/5 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevMonth}
                    className="text-xs font-black hover:text-engawa-600 bg-white/40 border border-white/50 w-6 h-6 flex items-center justify-center rounded-lg transition-all shadow-sm"
                  >
                    ←
                  </button>
                  <h3 className="text-xs font-extrabold tracking-wider text-engawa-800">
                    {currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                  </h3>
                  <button
                    onClick={goToNextMonth}
                    className="text-xs font-black hover:text-engawa-600 bg-white/40 border border-white/50 w-6 h-6 flex items-center justify-center rounded-lg transition-all shadow-sm"
                  >
                    →
                  </button>
                </div>
                <span className="text-[10px] font-bold text-wood-900/75">家族カレンダー</span>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-wood-900/75">
                <span className="text-red-400">日</span>
                <span>月</span>
                <span>火</span>
                <span>水</span>
                <span>木</span>
                <span>金</span>
                <span className="text-blue-400">土</span>
              </div>

              {/* Sliding Carousel Wrapper */}
              <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="w-full overflow-hidden touch-pan-y"
              >
                <div 
                  className="flex flex-row w-[300%]"
                  style={{
                    transform: isSwiping
                      ? `translateX(calc(-33.3333% + ${swipeOffset}px))`
                      : `translateX(${-33.3333 - (transitionIndex * 33.3333)}%)`,
                    transition: isSwiping || !isTransitioning ? 'none' : 'transform 300ms ease-out'
                  }}
                >
                  {/* Prev Month Grid */}
                  <div className="w-1/3 grid grid-cols-7 gap-1 justify-items-center shrink-0">
                    {renderCalendarGridForDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  </div>

                  {/* Current Month Grid */}
                  <div className="w-1/3 grid grid-cols-7 gap-1 justify-items-center shrink-0">
                    {renderCalendarGridForDate(currentDate)}
                  </div>

                  {/* Next Month Grid */}
                  <div className="w-1/3 grid grid-cols-7 gap-1 justify-items-center shrink-0">
                    {renderCalendarGridForDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  </div>
                </div>
              </div>
            </div>

            {/* Flat Event Agenda List */}
            <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden px-1">
              <div className="flex items-center justify-between pb-1 shrink-0">
                <h3 className="text-xs font-extrabold text-engawa-800 tracking-wider">
                  これからの予定
                </h3>
                <button
                  onClick={() => {
                    setCreateModalTab('event');
                    setIsCreateOpen(true);
                  }}
                  className="text-[9px] font-bold text-engawa-700 hover:text-white hover:bg-engawa-600 bg-white/50 border border-white/60 px-2.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1"
                >
                  <span>+</span>
                  <span>予定を追加</span>
                </button>
              </div>

              {futureEvents.length === 0 ? (
                <p className="text-xs text-wood-900/75 font-bold py-4 text-center">予定はありません。</p>
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 pb-4 hide-scrollbar">
                  {futureEvents.map((ev) => {
                    const attendeeIds = Object.keys(ev.attendees || {}).filter(uid => ev.attendees?.[uid] === true);
                    const isSelectedDate = ev.date === selectedDate;

                    return (
                      <div
                        key={ev.id}
                        id={`event-card-${ev.id}`}
                        onClick={() => {
                          if (ev.linkedPostId) {
                            navigate(`/post/${ev.linkedPostId}`);
                          } else {
                            setSelectedDetailEvent(ev);
                            setIsEventDetailOpen(true);
                          }
                        }}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all active:scale-[0.99] shadow-sm ${
                          isSelectedDate
                            ? 'bg-engawa-600/15 border-engawa-500/50 ring-1 ring-engawa-500/30'
                            : 'bg-white/50 border-white/50 hover:bg-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-wood-900/55 bg-white/50 px-2 py-0.5 rounded-md border border-white/30">
                            {ev.date.replace('-', '年').replace('-', '月') + '日'}
                          </span>
                          {ev.startTime && (
                            <span className="text-[9px] font-bold bg-white/60 border border-white/50 text-engawa-600 px-2 py-0.5 rounded-md">
                              {ev.startTime} {ev.endTime ? `~ ${ev.endTime}` : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <h4 className="text-xs font-extrabold text-engawa-800">{decryptText(ev.title)}</h4>
                        </div>
                        {ev.description && (
                          <p className="text-[11px] text-wood-900/90 mt-1 line-clamp-2">{decryptText(ev.description)}</p>
                        )}
                        
                        {/* 3-Limit Proportional Attendee Avatars Display with Other +X label */}
                        {attendeeIds.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {attendeeIds.slice(0, 3).map((uid) => {
                                const member = familyMembers[uid] || { name: '...', icon: '' };
                                return (
                                  <img
                                    key={uid}
                                    src={member.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                                    alt={member.name}
                                    className="inline-block h-5 w-5 rounded-full ring-2 ring-white bg-white/50 border border-white/10"
                                    title={member.name}
                                  />
                                );
                              })}
                            </div>
                            <span className="text-[10px] text-wood-900/70 font-bold">
                              {attendeeIds.length > 3 ? `他${attendeeIds.length - 3}名` : ''}
                              <span>が参加予定</span>
                            </span>
                          </div>
                        )}

                        {ev.linkedPostId && (
                          <div className="text-[9px] font-extrabold text-engawa-600 mt-2 hover:underline">
                            → 縁側での話を見る
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBVIEW C: SETTINGS & MEMBERS */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-4 animate-gentleSlideUp">
            
            {/* Profile Detail */}
            <div className="glass-card rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={userProfile?.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.uid}`}
                  alt={userProfile?.name}
                  className="w-12 h-12 rounded-full border border-white/30 bg-white/50"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-engawa-800">{userProfile?.name}</h3>
                  <p className="text-[10px] text-wood-900/75">{currentUser?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-10 h-10 rounded-full hover:bg-red-500/10 hover:text-red-600 text-wood-900/75 flex items-center justify-center transition-colors"
              >
                <LogOutIcon size={20} />
              </button>
            </div>

            {/* Notification Settings */}
            <div className="glass-card rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="text-engawa-600"><BellIcon size={18} /></div>
                <h3 className="text-xs font-extrabold text-engawa-800 tracking-wider">通知の設定</h3>
              </div>

              <div className="flex items-center justify-between bg-white/25 p-3.5 rounded-2xl border border-white/30">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-wood-900/80">バックグラウンド通知</span>
                  <span className="text-[10px] text-wood-900/75 font-medium">
                    {pushPermission === 'granted' 
                      ? '有効（リアルタイムにお届けします）' 
                      : pushPermission === 'denied' 
                        ? 'ブロック中（ブラウザ設定から許可してください）' 
                        : '未設定（意思を尊重してタップで設定します）'}
                  </span>
                </div>

                {pushPermission === 'granted' ? (
                  <span className="w-6 h-6 rounded-full bg-engawa-500/15 flex items-center justify-center text-engawa-600">
                    <CheckIcon size={12} />
                  </span>
                ) : pushPermission === 'denied' ? (
                  <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200/50">
                    要設定
                  </span>
                ) : (
                  <button
                    onClick={subscribeUser}
                    className="text-[10px] font-bold text-white bg-engawa-600 hover:bg-engawa-700 px-3.5 py-1.5 rounded-xl shadow shadow-engawa-600/10 transition-colors"
                  >
                    設定する
                  </button>
                )}
              </div>
            </div>

            {/* Font Size Settings */}
            <div className="glass-card rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-engawa-600 font-soft">Aa</span>
                <h3 className="text-xs font-extrabold text-engawa-800 tracking-wider">文字サイズの変更</h3>
              </div>

              <div className="flex bg-wood-900/5 p-1 rounded-2xl border border-white/20 mt-1">
                {(['small', 'normal', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => changeFontSize(size)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      fontSize === size
                        ? 'bg-white text-engawa-700 shadow-sm'
                        : 'text-wood-900/80 hover:text-wood-900/70'
                    }`}
                  >
                    {size === 'small' ? '小さめ' : size === 'normal' ? '普通' : '大きめ'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-wood-900/75 leading-relaxed px-1 font-medium text-center">
                スレッド本文やチャット、お知らせ履歴などの文字サイズが変更されます
              </p>
            </div>

            {/* App Update (PWA) Settings */}
            <div className="glass-card rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="text-engawa-600">
                  <LeafIcon size={18} />
                </div>
                <h3 className="text-xs font-extrabold text-engawa-800 tracking-wider">アプリの更新 (PWA)</h3>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Auto Update Toggle */}
                <div className="flex items-center justify-between bg-white/25 p-3.5 rounded-2xl border border-white/30">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-wood-900/80">自動アップデート</span>
                    <span className="text-[10px] text-wood-900/75 font-medium">
                      新バージョン検出時に強制的に更新します
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleAutoUpdate(!autoUpdate)}
                    className={`w-11 h-6 rounded-full transition-all duration-300 relative border flex items-center p-0.5 ${
                      autoUpdate
                        ? 'bg-engawa-600 border-engawa-500/20 justify-end'
                        : 'bg-wood-900/10 border-wood-900/10 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300" />
                  </button>
                </div>

                {/* Manual Update Check */}
                <div className="flex items-center justify-between bg-white/25 p-3.5 rounded-2xl border border-white/30">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-wood-900/80">手動で更新を検証</span>
                    <span className="text-[10px] text-wood-900/75 font-medium">
                      最新の更新情報をお庭に探しにいきます
                    </span>
                  </div>
                  <button
                    onClick={handleCheckUpdateManually}
                    disabled={isCheckingUpdate}
                    className="text-[10px] font-bold text-white bg-engawa-600 hover:bg-engawa-700 disabled:bg-engawa-600/50 px-3.5 py-2 rounded-xl shadow shadow-engawa-600/10 transition-all active:scale-95"
                  >
                    {isCheckingUpdate ? '確認中...' : '更新を確認'}
                  </button>
                </div>

                {/* Apply Manual Update Button (if waiting worker is found) */}
                {updateRegistration?.waiting && (
                  <div className="flex flex-col gap-2 p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl mt-1 text-center animate-pulse">
                    <span className="text-[10px] text-amber-800 font-extrabold">
                      新しいアップデートが利用可能です！
                    </span>
                    <button
                      onClick={handleApplyManualUpdate}
                      className="text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 py-2 rounded-xl transition-all"
                    >
                      今すぐアップデートを適用
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Family Members List */}
            <div className="glass-card rounded-2xl p-4 shadow-sm flex flex-col gap-3">
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
            <div className="glass-card rounded-2xl p-4 shadow-sm flex flex-col gap-3 text-center">
              <h3 className="text-xs font-extrabold text-engawa-800 tracking-wider">家族の追加</h3>
              <p className="text-[11px] text-wood-900/90 leading-relaxed px-2">
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

      {/* Nav bar (With integrated notched far-right sunken FAB) */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onPlusClick={() => {
          setCreateModalTab('post');
          setIsCreateOpen(true);
        }}
      />

      {/* Create Event/Post Modal */}
      <CreateModal
        isOpen={isCreateOpen}
        defaultTab={createModalTab}
        initialDate={createModalTab === 'event' ? selectedDate : ''}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          setActiveTab('home'); // go back to threads
        }}
      />

      {/* 4. Sliding Glassmorphic In-App Notification Drawer */}
      {isNotificationDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Transparent Backdrop with Blur */}
          <div 
            className="absolute inset-0 bg-wood-900/10 backdrop-blur-xs animate-gentleFadeIn" 
            onClick={() => setIsNotificationDrawerOpen(false)} 
          />
          
          {/* Sliding Solid Wood Panel (Shoji Door style sliding from Right to Left) */}
          <div className="relative z-10 w-full max-w-xs h-full wood-drawer p-5 flex flex-col gap-4 animate-gentleSlideLeft">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-wood-900/5 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="text-engawa-600"><BellIcon size={18} /></div>
                <h3 className="text-sm font-extrabold text-engawa-800 tracking-wider font-soft">お知らせ履歴</h3>
              </div>
              <button 
                onClick={() => setIsNotificationDrawerOpen(false)}
                className="text-xs font-bold text-wood-900/75 hover:text-wood-900/90 px-2 py-1 rounded-lg hover:bg-wood-900/5"
              >
                閉じる
              </button>
            </div>

            {/* Notifications Scroll Area */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 hide-scrollbar">
              {Object.keys(notifications).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-wood-900/30 text-center py-12">
                  <BellIcon size={32} className="opacity-20" />
                  <p className="text-[10px] font-bold">まだお知らせはありません。</p>
                </div>
              ) : (
                Object.values(notifications)
                  .sort((a: any, b: any) => {
                    // 1. Unread (false) first, then Read (true)
                    if (a.read !== b.read) {
                      return a.read ? 1 : -1;
                    }
                    // 2. Newest first (createdAt descending)
                    return b.createdAt - a.createdAt;
                  })
                  .map((notif: any) => {
                    const notifDate = new Date(notif.createdAt).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={notif.id}
                        onClick={async () => {
                          // 1. Mark notification as read in database
                          if (currentUser) {
                            await set(ref(database, `userNotifications/${currentUser.uid}/${notif.id}/read`), true);
                          }
                          // 2. Close drawer
                          setIsNotificationDrawerOpen(false);
                          // 3. Jump/Navigate directly to the deep-linked path (handles highlight scroll)
                          navigate(notif.linkPath);
                        }}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-1.5 hover:scale-[1.01] active:scale-[0.99] ${
                          notif.read
                            ? 'bg-white/10 border-white/20 text-wood-900/80'
                            : 'bg-white/60 border-engawa-500/30 text-wood-900 ring-1 ring-engawa-500/10 shadow shadow-engawa-500/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className={`text-xs font-extrabold ${notif.read ? 'text-wood-900/90' : 'text-engawa-800'}`}>
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1 animate-pulse" />
                          )}
                        </div>
                        <p className={`font-medium leading-relaxed truncate text-wood-900 ${getBodyTextClass(fontSize)}`}>{notif.body}</p>
                        
                        {/* Dynamic manual read/unread toggle button & Date row */}
                        <div className="flex items-center justify-between border-t border-wood-900/5 pt-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[8px] text-wood-900/30 font-bold">{notifDate}</span>
                          <button
                            onClick={async () => {
                              if (currentUser) {
                                await set(ref(database, `userNotifications/${currentUser.uid}/${notif.id}/read`), !notif.read);
                              }
                            }}
                            className={`text-[8px] font-bold px-2 py-1 rounded-lg border transition-all active:scale-95 ${
                              notif.read
                                ? 'bg-white/35 border-white/50 text-wood-900/75 hover:bg-white/55'
                                : 'bg-engawa-600/15 border-engawa-500/25 text-engawa-800 hover:bg-engawa-600/25'
                            }`}
                          >
                            {notif.read ? '未読にする' : '既読にする'}
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Sliding Glassmorphic Family Switcher Drawer Overlay */}
      {isFamilySwitcherOpen && (
        <div className="fixed inset-0 z-50 flex justify-start">
          {/* Backdrop with Blur */}
          <div 
            className="absolute inset-0 bg-wood-900/10 backdrop-blur-xs animate-gentleFadeIn" 
            onClick={() => setIsFamilySwitcherOpen(false)} 
          />
          
          {/* Sliding Solid Wood Panel (Shoji Door style sliding from Left to Right) */}
          <div className="relative z-10 w-full max-w-[260px] h-full wood-drawer-left p-5 flex flex-col gap-4 animate-gentleSlideRight">
            
            {/* Switcher Header */}
            <div className="flex items-center justify-between border-b border-wood-900/5 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-engawa-500/10 flex items-center justify-center text-engawa-600 border border-engawa-500/15">
                  <HomeIcon size={16} />
                </div>
                <h3 className="text-xs font-extrabold text-engawa-800 tracking-wider font-soft">家族の切り替え</h3>
              </div>
              <button 
                onClick={() => setIsFamilySwitcherOpen(false)}
                className="text-xs font-bold text-wood-900/75 hover:text-wood-900/90 px-2 py-1 rounded-lg hover:bg-wood-900/5"
              >
                閉じる
              </button>
            </div>

            {/* Families List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 hide-scrollbar">
              {userFamiliesList.map((fam) => {
                const isActive = fam.id === userProfile?.activeFamilyId;

                return (
                  <button
                    key={fam.id}
                    onClick={async () => {
                      if (isActive) {
                        setIsFamilySwitcherOpen(false);
                        return;
                      }
                      setPostsLoading(true); // show shimmer loading during switch
                      await switchFamily(fam.id);
                      setIsFamilySwitcherOpen(false);
                      setActiveTab('home'); // go home
                    }}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                      isActive
                        ? 'bg-engawa-600/10 border-engawa-500/30 text-engawa-800 ring-1 ring-engawa-500/10 font-bold'
                        : 'bg-white/40 border-white/30 text-wood-900/70 hover:bg-white/65'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-engawa-600 shrink-0" />
                      )}
                      <span className="text-xs truncate">{fam.name}</span>
                    </div>
                    {isActive && (
                      <span className="text-engawa-600">
                        <CheckIcon size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Add Family Option */}
            <button
              onClick={() => {
                setIsFamilySwitcherOpen(false);
                navigate('/setup-family', { state: { canCancel: true } });
              }}
              className="w-full mt-auto py-3 px-4 rounded-2xl bg-engawa-600 hover:bg-engawa-700 text-white font-bold text-xs tracking-wider shadow shadow-engawa-600/10 flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 font-soft"
            >
              <span>+</span>
              <span>新しい家族を登録・参加</span>
            </button>

          </div>
        </div>
      )}

      {/* 6. Sliding Glassmorphic Event Detail Dialog Overlay */}
      {isEventDetailOpen && selectedDetailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with Blur */}
          <div 
            className="absolute inset-0 bg-wood-900/25 backdrop-blur-md animate-gentleFadeIn" 
            onClick={() => setIsEventDetailOpen(false)} 
          />
          
          {/* Detailed Dialog Box */}
          <div className="relative z-10 w-full max-w-[310px] bg-white/85 backdrop-blur-lg border border-white/60 shadow-2xl rounded-3xl p-5 flex flex-col gap-4 animate-gentleScaleIn">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-wood-900/5 pb-2">
              <h3 className="text-sm font-extrabold text-engawa-800 tracking-wider font-soft">予定の詳細</h3>
              <button 
                onClick={() => setIsEventDetailOpen(false)}
                className="text-xs font-bold text-wood-900/40 hover:text-wood-900/60"
              >
                ✕
              </button>
            </div>

            {/* Event Info */}
            <div className="flex flex-col gap-2.5">
              <div>
                <h4 className="text-base font-extrabold text-engawa-800">{decryptText(selectedDetailEvent.title)}</h4>
                <p className="text-xs text-wood-900/80 font-bold mt-1">
                  📅 {selectedDetailEvent.date}
                  {selectedDetailEvent.startTime ? ` | ⏰ ${selectedDetailEvent.startTime}${selectedDetailEvent.endTime ? ` ~ ${selectedDetailEvent.endTime}` : ''}` : ' | ⏰ 終日'}
                </p>
              </div>

              {selectedDetailEvent.description && (
                <p className="text-xs text-wood-900/95 leading-relaxed bg-white/40 p-3 rounded-xl border border-white/40 whitespace-pre-line">
                  {decryptText(selectedDetailEvent.description)}
                </p>
              )}

              {/* Attendees list */}
              <div className="flex flex-col gap-1.5 mt-1">
                <label className="text-[10px] font-bold text-engawa-800 tracking-wider">参加メンバー</label>
                <div className="flex flex-col gap-2 bg-white/30 p-2.5 rounded-xl border border-white/35">
                  {(() => {
                    const attendeesMap = selectedDetailEvent.attendees || {};
                    const attendeeUids = Object.keys(attendeesMap).filter(uid => attendeesMap[uid] === true);
                    
                    if (attendeeUids.length === 0) {
                      return <p className="text-[10px] text-wood-900/40 font-bold py-1 text-center">まだ参加予定のメンバーはいません</p>;
                    }
                    
                    return attendeeUids.map((uid) => {
                      const member = familyMembers[uid] || { name: '...', icon: '' };
                      return (
                        <div key={uid} className="flex items-center gap-2.5">
                          <img
                            src={member.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                            alt={member.name}
                            className="w-6 h-6 rounded-full bg-white/50 border border-white/20"
                          />
                          <span className="text-xs font-bold text-wood-900/90">{member.name}</span>
                          {uid === selectedDetailEvent.authorId && (
                            <span className="text-[8px] font-bold bg-engawa-100 text-engawa-700 border border-engawa-500/10 px-1 py-0.5 rounded ml-auto">主催</span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Edit Date Section (visible to creator of the event) */}
              {currentUser && currentUser.uid === selectedDetailEvent.authorId && (
                <div className="flex flex-col gap-1.5 border-t border-wood-900/5 pt-3">
                  <label className="text-[10px] font-bold text-engawa-800 tracking-wider">日付を変更する</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={editEventDate}
                      onChange={(e) => setEditEventDate(e.target.value)}
                      className="flex-1 glass-input rounded-xl px-2.5 py-1.5 text-xs text-wood-900 shadow-sm border border-wood-900/10 h-8"
                    />
                    <button
                      onClick={handleUpdateEventDate}
                      className="text-[10px] font-bold text-white bg-engawa-600 hover:bg-engawa-700 px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all h-8 flex items-center justify-center"
                    >
                      変更
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Attendance Toggle Button */}
            {currentUser && (() => {
              const attendeesMap = selectedDetailEvent.attendees || {};
              const isAttending = attendeesMap[currentUser.uid] === true;
              
              return (
                <button
                  onClick={async () => {
                    if (!userProfile?.activeFamilyId) return;
                    const eventId = selectedDetailEvent.id;
                    const attendeeRef = ref(database, `calendarEvents/${userProfile.activeFamilyId}/${eventId}/attendees/${currentUser.uid}`);
                    
                    // Toggle in database
                    await set(attendeeRef, !isAttending);
                    
                    // Refresh selectedDetailEvent in local state dynamically!
                    setSelectedDetailEvent(prev => {
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
                  className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all active:scale-95 border ${
                    isAttending
                      ? 'bg-red-500/10 border-red-500/20 text-red-700 hover:bg-red-500/15'
                      : 'bg-engawa-600 hover:bg-engawa-700 border-transparent text-white shadow shadow-engawa-600/15'
                  }`}
                >
                  {isAttending ? '参加を取り消す' : 'この予定に参加する'}
                </button>
              );
            })()}

          </div>
        </div>
      )}

      {/* Custom Reusable Dialog Modals */}
      <Dialog
        isOpen={dialogOpen}
        title={dialogTitle}
        message={dialogMessage}
        onClose={() => setDialogOpen(false)}
      />

      {/* Dynamic Release Note Dialog Pop-up */}
      <ReleaseNoteModal
        isOpen={isReleaseNoteOpen}
        onClose={handleCloseReleaseNote}
      />
    </div>
  );
};
