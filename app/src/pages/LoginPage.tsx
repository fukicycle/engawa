import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { LeafBackground } from '../components/LeafBackground';
import { HomeIcon } from '../components/Icons';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/setup-family');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に登録されています。');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('メールアドレスまたはパスワードが正しくありません。');
      } else if (err.code === 'auth/weak-password') {
        setError('パスワードは6文字以上で入力してください。');
      } else {
        setError('エラーが発生しました。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/setup-family');
    } catch (err: any) {
      console.error(err);
      setError('Googleログインに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      <LeafBackground />

      <div className="relative z-10 w-full max-w-md glass-card rounded-3xl p-8 flex flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-engawa-500/10 flex items-center justify-center text-engawa-600 border border-engawa-500/20">
            <HomeIcon size={24} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-widest text-engawa-800 font-soft mt-2">
            {isSignUp ? '新しく縁側を作る' : '縁側に入る'}
          </h2>
          <p className="text-xs text-wood-900/50">
            {isSignUp ? 'アカウントを作成して家族の輪に参加しましょう' : 'メールアドレスまたはアカウントで入室します'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50/70 backdrop-blur border border-red-200/50 text-red-800 text-xs px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-engawa-800 tracking-wider">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@family.com"
              className="glass-input rounded-2xl px-4 py-3 text-sm text-wood-900 placeholder:text-wood-900/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-engawa-800 tracking-wider">パスワード</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="glass-input rounded-2xl px-4 py-3 text-sm text-wood-900 placeholder:text-wood-900/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-6 rounded-2xl bg-engawa-600 hover:bg-engawa-700 disabled:opacity-50 text-white font-bold tracking-wider shadow-lg shadow-engawa-600/15 hover:shadow-engawa-600/25 transition-all font-soft"
          >
            {loading ? '処理中...' : isSignUp ? '登録する' : '入室する'}
          </button>
        </form>

        <div className="flex items-center my-1">
          <div className="flex-1 border-t border-wood-900/10"></div>
          <span className="px-3 text-xs text-wood-900/30 font-bold">または</span>
          <div className="flex-1 border-t border-wood-900/10"></div>
        </div>

        {/* Google Authentication */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-6 rounded-2xl bg-white/65 hover:bg-white/90 border border-white/50 text-wood-900/80 font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          {/* Custom elegant Google icon (colored circles SVG) */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.74 14.93 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.86 3C6.27 7.5 8.9 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.56v2.96h3.92c2.29-2.11 3.53-5.21 3.53-8.67z"
            />
            <path
              fill="#FBBC05"
              d="M5.36 14.5c-.24-.72-.38-1.49-.38-2.29a7.6 7.6 0 0 1 .38-2.29L1.5 6.92A11.944 11.944 0 0 0 0 12c0 1.83.42 3.57 1.17 5.12l4.19-2.62z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.92-2.96c-1.09.73-2.48 1.16-4.04 1.16-3.1 0-5.73-2.46-6.64-5.46L1.5 16.44C3.39 20.35 7.35 23 12 23z"
            />
          </svg>
          Googleで入室
        </button>

        {/* Toggle Account Type */}
        <p className="text-center text-xs text-wood-900/50">
          {isSignUp ? '既にアカウントをお持ちですか？' : 'まだ登録していませんか？'}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-engawa-600 font-bold hover:underline ml-1"
          >
            {isSignUp ? '入室はこちら' : '新しく作る'}
          </button>
        </p>
      </div>
    </div>
  );
};
