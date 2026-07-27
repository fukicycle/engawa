import React from 'react';

interface DialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  title,
  message,
  isConfirm = false,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dynamic Backdrop */}
      <div className="absolute inset-0 bg-wood-900/10 backdrop-blur-xs animate-fadeIn" onClick={onClose} />

      {/* Elegant Glassmorphic Dialog Box */}
      <div className="relative z-10 w-full max-w-[280px] bg-white/15 backdrop-blur-xl border border-white/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center animate-scaleIn">
        <h4 className="font-extrabold text-sm text-engawa-800 tracking-wider font-soft">{title}</h4>
        <p className="text-xs text-wood-900/70 leading-relaxed font-medium break-all">{message}</p>
        
        <div className="flex gap-2.5 justify-center mt-1">
          {isConfirm ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] font-bold text-wood-900/40 px-4 py-2 rounded-xl hover:bg-wood-900/5 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="text-[10px] font-bold text-white bg-engawa-600 hover:bg-engawa-700 px-5 py-2 rounded-xl shadow shadow-engawa-600/10 hover:shadow-engawa-600/25 transition-all transform active:scale-95"
              >
                はい
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-bold text-white bg-engawa-600 hover:bg-engawa-700 px-6 py-2.5 rounded-xl shadow shadow-engawa-600/10 hover:shadow-engawa-600/25 transition-all transform active:scale-95 font-soft"
            >
              了解
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
