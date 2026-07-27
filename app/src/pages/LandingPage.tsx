import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LeafBackground } from '../components/LeafBackground';
import { HomeIcon, PostIcon, CalendarIcon } from '../components/Icons';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      <LeafBackground />

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-md glass-card rounded-3xl p-8 text-center flex flex-col items-center gap-6">
        {/* Title logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-engawa-500/10 flex items-center justify-center text-engawa-600 border border-engawa-500/20">
            <HomeIcon size={36} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-widest text-engawa-800 font-soft">縁側</h1>
          <p className="text-sm tracking-wider text-wood-900/60 font-medium">えんがわ — 家族をつなぐ、静かな場所</p>
        </div>

        <hr className="w-full border-wood-900/10" />

        {/* Concept Description */}
        <p className="text-wood-900/80 leading-relaxed text-sm text-left px-2">
          LINEのようにグループが乱立して疲れていませんか？<br />
          <strong>「縁側」</strong>は、家族がひとつの場所に集まり、のんびりと会話を始めるための道具です。
        </p>

        {/* Feature Highlights */}
        <div className="w-full flex flex-col gap-4 text-left">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/25 border border-white/40">
            <div className="text-engawa-600 mt-1"><PostIcon size={20} /></div>
            <div>
              <h3 className="font-bold text-sm text-engawa-700">スレッド（投稿）式の会話</h3>
              <p className="text-xs text-wood-900/70 mt-0.5">話題ごとに会話をまとめます。関係ないチャットの通知に悩まされることはありません。</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/25 border border-white/40">
            <div className="text-engawa-600 mt-1"><CalendarIcon size={20} /></div>
            <div>
              <h3 className="font-bold text-sm text-engawa-700">家族カレンダー</h3>
              <p className="text-xs text-wood-900/70 mt-0.5">いつ・誰が何をするかを全員で共有。会話（投稿）とカレンダーを連携することもできます。</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <button
          onClick={() => navigate('/login')}
          className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-engawa-600 hover:bg-engawa-700 text-white font-bold tracking-wider shadow-lg shadow-engawa-600/15 hover:shadow-engawa-600/25 transition-all transform hover:-translate-y-0.5 font-soft"
        >
          はじめる
        </button>
      </div>

      <div className="relative z-10 mt-8 text-xs text-wood-900/40 font-medium tracking-wide">
        © 2026 Engawa. Made with care.
      </div>
    </div>
  );
};
