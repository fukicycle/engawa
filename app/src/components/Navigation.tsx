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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/40 backdrop-blur-lg border-t border-white/20 shadow-lg px-6 py-2 flex justify-between items-center max-w-md mx-auto rounded-t-3xl">
      {/* Home Tab */}
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
          activeTab === 'home' 
            ? 'text-engawa-600 font-bold scale-105' 
            : 'text-wood-900/40 hover:text-wood-900/70'
        }`}
      >
        <HomeIcon size={22} />
        <span className="text-[10px] tracking-wider">縁側</span>
      </button>

      {/* Floating Center Plus Button */}
      <div className="relative -top-5">
        <button
          onClick={onPlusClick}
          className="w-12 h-12 rounded-full bg-engawa-600 hover:bg-engawa-700 text-white flex items-center justify-center shadow-lg shadow-engawa-600/30 hover:shadow-engawa-600/50 transition-all hover:scale-105 active:scale-95 border border-white/20"
        >
          <PlusIcon size={24} />
        </button>
      </div>

      {/* Calendar Tab */}
      <button
        onClick={() => setActiveTab('calendar')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
          activeTab === 'calendar' 
            ? 'text-engawa-600 font-bold scale-105' 
            : 'text-wood-900/40 hover:text-wood-900/70'
        }`}
      >
        <CalendarIcon size={22} />
        <span className="text-[10px] tracking-wider">暦</span>
      </button>

      {/* Settings Tab */}
      <button
        onClick={() => setActiveTab('settings')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
          activeTab === 'settings' 
            ? 'text-engawa-600 font-bold scale-105' 
            : 'text-wood-900/40 hover:text-wood-900/70'
        }`}
      >
        <UserIcon size={22} />
        <span className="text-[10px] tracking-wider">手帳</span>
      </button>
    </div>
  );
};
