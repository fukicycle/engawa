import React from 'react';
import { HomeIcon, CalendarIcon, UserIcon } from './Icons';

interface NavigationProps {
  activeTab: 'home' | 'calendar' | 'settings';
  setActiveTab: (tab: 'home' | 'calendar' | 'settings') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  activeTab, 
  setActiveTab
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/40 backdrop-blur-lg border-t border-white/20 shadow-lg px-8 py-2.5 flex justify-between items-center max-w-md mx-auto rounded-t-3xl">
      {/* Home Tab */}
      <button
        onClick={() => setActiveTab('home')}
        className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition-all ${
          activeTab === 'home' 
            ? 'text-engawa-600 font-extrabold scale-105' 
            : 'text-wood-900/40 hover:text-wood-900/70'
        }`}
      >
        <HomeIcon size={22} />
        <span className="text-[10px] tracking-wider font-bold">縁側</span>
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
        <CalendarIcon size={22} />
        <span className="text-[10px] tracking-wider font-bold">暦</span>
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
        <UserIcon size={22} />
        <span className="text-[10px] tracking-wider font-bold">手帳</span>
      </button>
    </div>
  );
};
