import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LeafBackground } from '../components/LeafBackground';
import { UserIcon, PlusIcon, CheckIcon } from '../components/Icons';

export const SetupFamilyPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, updateProfileName, createFamily, joinFamily } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [mode, setMode] = useState<'name' | 'choose' | 'create' | 'join'>('name');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (userProfile) {
      setDisplayName(userProfile.name || currentUser.displayName || '');
      if (userProfile.familyId) {
        navigate('/'); // If already has family, go home
      } else if (userProfile.name) {
        setMode('choose');
      }
    }
  }, [currentUser, userProfile]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    
    setError('');
    setLoading(true);
    try {
      await updateProfileName(displayName.trim());
      setMode('choose');
    } catch (err: any) {
      console.error(err);
      setError('プロフィールの保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;

    setError('');
    setLoading(true);
    try {
      await createFamily(familyName.trim());
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('家族グループの作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setError('');
    setLoading(true);
    try {
      await joinFamily(inviteCode.trim());
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || '家族への参加に失敗しました。コードを確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      <LeafBackground />

      <div className="relative z-10 w-full max-w-md glass-card rounded-3xl p-8 flex flex-col gap-6">
        
        {/* Step 1: Input Profile Name */}
        {mode === 'name' && (
          <form onSubmit={handleSaveName} className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="w-12 h-12 rounded-full bg-engawa-500/10 flex items-center justify-center text-engawa-600 border border-engawa-500/20">
                <UserIcon size={24} />
              </div>
              <h2 className="text-xl font-extrabold tracking-widest text-engawa-800 font-soft mt-2">
                お名前を教えてください
              </h2>
              <p className="text-xs text-wood-900/50">
                家族グループ内で表示される、あなたの名前を設定します
              </p>
            </div>

            {error && <div className="text-red-800 text-xs text-center">{error}</div>}

            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                required
                maxLength={20}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例: パパ、ママ、たろう"
                className="glass-input rounded-2xl px-4 py-3 text-center text-sm font-bold text-wood-900 placeholder:text-wood-900/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-engawa-600 hover:bg-engawa-700 disabled:opacity-50 text-white font-bold tracking-wider shadow-md transition-all font-soft"
            >
              次へ
            </button>
          </form>
        )}

        {/* Step 2: Choose Create or Join */}
        {mode === 'choose' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-1 text-center">
              <h2 className="text-xl font-extrabold tracking-widest text-engawa-800 font-soft">
                ようこそ、{userProfile?.name}さん
              </h2>
              <p className="text-xs text-wood-900/50">
                新しく家族を作るか、既存の家族に参加します
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Create Card */}
              <button
                onClick={() => setMode('create')}
                className="flex items-center gap-4 p-5 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/60 text-left transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-engawa-500/10 flex items-center justify-center text-engawa-600 border border-engawa-500/15 group-hover:scale-105 transition-transform">
                  <PlusIcon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-engawa-800">新しく家族グループを作る</h3>
                  <p className="text-xs text-wood-900/60 mt-0.5">あなたが代表者となって、新しく家族の「縁側」を作成します</p>
                </div>
              </button>

              {/* Join Card */}
              <button
                onClick={() => setMode('join')}
                className="flex items-center gap-4 p-5 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/60 text-left transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-engawa-500/10 flex items-center justify-center text-engawa-600 border border-engawa-500/15 group-hover:scale-105 transition-transform">
                  <CheckIcon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-engawa-800">招待コードで家族に参加する</h3>
                  <p className="text-xs text-wood-900/60 mt-0.5">既に家族の誰かが作成したグループに招待コードで参加します</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setMode('name')}
              className="text-xs font-bold text-wood-900/40 hover:text-wood-900/60 transition-colors text-center"
            >
              ← 名前の再入力に戻る
            </button>
          </div>
        )}

        {/* Option A: Create Family Form */}
        {mode === 'create' && (
          <form onSubmit={handleCreateFamily} className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-1 text-center">
              <h2 className="text-xl font-extrabold tracking-widest text-engawa-800 font-soft">
                家族グループを作る
              </h2>
              <p className="text-xs text-wood-900/50">
                家族グループの名前（例: 〇〇家、山田ファミリーなど）を決めます
              </p>
            </div>

            {error && <div className="text-red-800 text-xs text-center">{error}</div>}

            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                required
                maxLength={30}
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="例: 山田家"
                className="glass-input rounded-2xl px-4 py-3 text-center text-sm font-bold text-wood-900 placeholder:text-wood-900/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-engawa-600 hover:bg-engawa-700 disabled:opacity-50 text-white font-bold tracking-wider shadow-md transition-all font-soft"
            >
              作成する
            </button>

            <button
              type="button"
              onClick={() => setMode('choose')}
              className="text-xs font-bold text-wood-900/40 hover:text-wood-900/60 transition-colors text-center"
            >
              戻る
            </button>
          </form>
        )}

        {/* Option B: Join Family Form */}
        {mode === 'join' && (
          <form onSubmit={handleJoinFamily} className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-1 text-center">
              <h2 className="text-xl font-extrabold tracking-widest text-engawa-800 font-soft">
                家族に参加する
              </h2>
              <p className="text-xs text-wood-900/50">
                家族が発行した招待コード（英大文字・数字6桁）を入力してください
              </p>
            </div>

            {error && <div className="text-red-800 text-xs text-center">{error}</div>}

            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                required
                maxLength={10}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="例: X5B9YT"
                className="glass-input rounded-2xl px-4 py-3 text-center text-sm font-bold tracking-widest text-wood-900 placeholder:text-wood-900/30 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-engawa-600 hover:bg-engawa-700 disabled:opacity-50 text-white font-bold tracking-wider shadow-md transition-all font-soft"
            >
              参加する
            </button>

            <button
              type="button"
              onClick={() => setMode('choose')}
              className="text-xs font-bold text-wood-900/40 hover:text-wood-900/60 transition-colors text-center"
            >
              戻る
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
