import React from 'react';
import { LeafBackground } from './LeafBackground';
import { LeafIcon } from './Icons';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = '庭の手入れをしています...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden select-none">
      <LeafBackground />
      
      {/* Centered card with glassmorphism and subtle shadow */}
      <div className="relative z-10 w-full max-w-[280px] glass-card rounded-3xl p-6 flex flex-col items-center justify-center gap-4 border border-white/50 shadow-xl animate-gentleScaleIn text-center">
        {/* Pulsating Leaf Container */}
        <div className="w-16 h-16 rounded-full bg-engawa-500/10 flex items-center justify-center text-engawa-600 border border-engawa-500/20 shadow-inner animate-pulse duration-[2000ms]">
          <LeafIcon size={32} />
        </div>
        
        {/* elegant soft loading message */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-extrabold tracking-widest text-engawa-800 font-soft">
            {message}
          </p>
          <span className="text-[9px] tracking-widest text-wood-900/40 uppercase font-mono font-bold animate-pulse duration-[1500ms]">
            お静かにお待ちください
          </span>
        </div>
      </div>
    </div>
  );
};
