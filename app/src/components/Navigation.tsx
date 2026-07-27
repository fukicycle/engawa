import React from 'react';
import { HomeIcon, CalendarIcon, UserIcon, PlusIcon } from './Icons';

interface NavigationProps {
  activeTab: 'home' | 'calendar' | 'settings';
  setActiveTab: (tab: 'home' | 'calendar' | 'settings') => void;
  onPlusClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  activeTab, 
  setActiveTab,
  onPlusClick
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto h-[64px]">
      
      {/* 1. Custom Circular Notch/Cutout Mask (The Carved-out effect) */}
      <div className="absolute top-[-18px] right-5 w-14 h-14 rounded-full bg-wood-100 border border-white/20 shadow-inner z-30" />

      {/* 2. Half-sunken Creation Button (FAB embedded in the notch) */}
      <button
        onClick={onPlusClick}
        className="absolute top-[-12px] right-6 w-12 h-12 rounded-full bg-engawa-600 hover:bg-engawa-700 text-white flex items-center justify-center shadow-lg shadow-engawa-600/35 border border-white/25 active:scale-95 hover:scale-105 transition-all z-40"
        title="作成する"
      >
        <PlusIcon size={20} />
      </button>

      {/* 3. Main Translucent Bottom Navigation Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[64px] bg-white/40 backdrop-blur-md border-t border-white/20 shadow-lg px-5 flex items-center justify-between rounded-t-3xl z-20">
        
        {/* Home Tab */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition-all ${
            activeTab === 'home' 
              ? 'text-engawa-600 font-extrabold scale-105' 
              : 'text-wood-900/40 hover:text-wood-900/70'
          }`}
        >
          <HomeIcon size={20} />
          <span className="text-[9px] tracking-wider font-extrabold">縁側</span>
        </button>

        {/* Calendar Tab */}
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition-all ${
            activeTab === 'calendar' 
              ? 'text-engawa-600 font-extrabold scale-105' 
              : 'text-wood-900/40 hover:text-wood-900/70'
          }`}
        >
          <CalendarIcon size={20} />
          <span className="text-[9px] tracking-wider font-extrabold">暦</span>
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition-all ${
            activeTab === 'settings' 
              ? 'text-engawa-600 font-extrabold scale-105' 
              : 'text-wood-900/40 hover:text-wood-900/70'
          }`}
        >
          <UserIcon size={20} />
          <span className="text-[9px] tracking-wider font-extrabold">手帳</span>
        </button>

        {/* Empty Spacer on the far right (Matches width of notch/FAB space) */}
        <div className="w-16 shrink-0" />
      </div>

    </div>
  );
};
