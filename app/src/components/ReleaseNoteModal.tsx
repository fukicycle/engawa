import React from 'react';
import { LeafBackground } from './LeafBackground';
import { CheckIcon } from './Icons';
import releaseNotes from '../assets/release-notes.json';

interface ReleaseNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReleaseNoteModal: React.FC<ReleaseNoteModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const hasContent = releaseNotes.features.length > 0 || releaseNotes.fixes.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div 
        className="absolute inset-0 bg-wood-900/10 backdrop-blur-md animate-gentleFadeIn" 
        onClick={onClose} 
      />

      {/* Release Notes Dialog Box */}
      <div className="relative z-10 w-full max-w-[340px] max-h-[85vh] glass-card rounded-3xl p-6 flex flex-col gap-4 animate-gentleScaleIn border border-white/50 shadow-2xl">
        <LeafBackground />

        {/* Header */}
        <div className="flex flex-col gap-1 text-center border-b border-wood-900/5 pb-3 shrink-0 relative z-10">
          <span className="text-[10px] tracking-widest text-engawa-600 font-extrabold uppercase font-mono bg-engawa-500/10 px-2.5 py-0.5 rounded-full mx-auto">
            {releaseNotes.version}
          </span>
          <h3 className="text-base font-extrabold text-engawa-800 tracking-wider font-soft mt-1">
            更新のお知らせ
          </h3>
          <p className="text-[10px] text-wood-900/55 font-bold">
            縁側が新しくなりました
          </p>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 relative z-10 hide-scrollbar min-h-0">
          {!hasContent ? (
            <p className="text-xs text-wood-900/50 text-center py-6 font-bold">
              内部的な改善が行われました。
            </p>
          ) : (
            <>
              {/* Features List */}
              {releaseNotes.features.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-[11px] font-extrabold tracking-wider text-engawa-800 bg-engawa-500/10 px-2.5 py-1 rounded-lg w-fit">
                    🌱 機能追加
                  </h4>
                  <ul className="flex flex-col gap-2 pl-1">
                    {releaseNotes.features.map((item, idx) => (
                      <li key={`feat-${idx}`} className="flex items-start gap-2 text-xs text-wood-900/90 leading-relaxed font-medium">
                        <span className="text-engawa-600 shrink-0 mt-1">
                          <CheckIcon size={12} />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fixes List */}
              {releaseNotes.fixes.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-wood-900/5 pt-3">
                  <h4 className="text-[11px] font-extrabold tracking-wider text-amber-800 bg-amber-500/10 px-2.5 py-1 rounded-lg w-fit">
                    🛠️ 改善・バグ修正
                  </h4>
                  <ul className="flex flex-col gap-2 pl-1">
                    {releaseNotes.fixes.map((item, idx) => (
                      <li key={`fix-${idx}`} className="flex items-start gap-2 text-xs text-wood-900/90 leading-relaxed font-medium">
                        <span className="text-amber-600 shrink-0 mt-1">
                          <CheckIcon size={12} />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full relative z-10 py-3 rounded-2xl bg-engawa-600 hover:bg-engawa-700 text-white font-bold text-xs tracking-widest shadow shadow-engawa-600/10 flex items-center justify-center transition-all active:scale-95 shrink-0 font-soft"
        >
          縁側をたのしむ
        </button>
      </div>
    </div>
  );
};
