import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';
import { LeafBackground } from '../components/LeafBackground';
import { HomeIcon } from '../components/Icons';

declare const google: any;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess('パスワード再設定用のメールを送信しました。メールボックスをご確認ください。');
    } catch (err) {
      const firebaseError = err as { code?: string };
      console.error(firebaseError);
      if (firebaseError.code === 'auth/invalid-email') {
        setResetError('有効なメールアドレスを入力してください。');
      } else if (firebaseError.code === 'auth/user-not-found') {
        setResetError('このメールアドレスは登録されていません。');
      } else {
        setResetError('エラーが発生しました。メールアドレスを確認してもう一度お試しください。');
      }
    } finally {
      setResetLoading(false);
    }
  };

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

  const handleGoogleLogin = () => {
    setError('');

    if (typeof google === 'undefined') {
      setError('Google認証ライブラリを読み込み中です。少々お待ちください。');
      return;
    }

    setLoading(true);

    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'your-google-client-id.apps.googleusercontent.com') {
        throw new Error('Google Client ID is not configured.');
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (response: any) => {
          if (response.error) {
            console.error('Google token error:', response.error);
            setError('Googleログインに失敗しました。');
            setLoading(false);
            return;
          }

          if (response.access_token) {
            try {
              const credential = GoogleAuthProvider.credential(null, response.access_token);
              await signInWithCredential(auth, credential);
              navigate('/setup-family');
            } catch (authErr: any) {
              console.error('Firebase sign-in error:', authErr);
              setError('Firebaseのログイン認証に失敗しました。');
            } finally {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        },
        error_callback: (err: any) => {
          console.error('GSI client error:', err);
          setError('Googleログイン中にエラーが発生しました。');
          setLoading(false);
        }
      });

      client.requestAccessToken();
    } catch (err: any) {
      console.error('Google Auth Init error:', err);
      if (err.message && err.message.includes('Client ID')) {
        setError('Googleログインが設定されていません（クライアントID未設定）。');
      } else {
        setError('Googleログインの開始に失敗しました。');
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      <LeafBackground />

      <div className="relative z-10 w-full max-w-md glass-card rounded-3xl p-8 flex flex-col gap-6 animate-gentleScaleIn">
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
              className="glass-input rounded-2xl px-4 py-3 text-base text-wood-900 placeholder:text-wood-900/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-engawa-800 tracking-wider">パスワード</label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetError('');
                    setResetSuccess('');
                    setIsResetModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-engawa-600 hover:underline hover:text-engawa-700 transition-colors"
                >
                  パスワードを忘れた方
                </button>
              )}
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="glass-input rounded-2xl px-4 py-3 text-base text-wood-900 placeholder:text-wood-900/30"
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

      {/* Password Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dynamic Backdrop */}
          <div 
            className="absolute inset-0 bg-wood-900/15 backdrop-blur-xs animate-gentleFadeIn" 
            onClick={() => {
              if (!resetLoading) setIsResetModalOpen(false);
            }} 
          />

          {/* Elegant Glassmorphic Box */}
          <div className="relative z-10 w-full max-w-[340px] bg-white/85 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-gentleScaleIn">
            <h3 className="text-base font-extrabold text-engawa-800 tracking-wider font-soft text-center mt-1">
              パスワードの再設定
            </h3>
            
            {resetSuccess ? (
              <div className="flex flex-col gap-4 text-center py-2">
                <div className="bg-engawa-50/70 backdrop-blur border border-engawa-200/50 text-engawa-800 text-xs px-4 py-3 rounded-2xl leading-relaxed">
                  {resetSuccess}
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-engawa-600 hover:bg-engawa-700 text-white text-xs font-bold tracking-wider shadow transition-all font-soft active:scale-95"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
                <p className="text-xs text-wood-900/70 leading-relaxed font-medium">
                  ご登録済みのメールアドレスを入力してください。パスワード再設定用のメールを送信します。
                </p>

                {resetError && (
                  <div className="bg-red-50/70 backdrop-blur border border-red-200/50 text-red-800 text-xs px-4 py-2.5 rounded-xl">
                    {resetError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-engawa-800 tracking-wider">メールアドレス</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="example@family.com"
                    className="glass-input rounded-xl px-4 py-2.5 text-sm text-wood-900 placeholder:text-wood-900/30"
                  />
                </div>

                <div className="flex gap-2.5 justify-end mt-2">
                  <button
                    type="button"
                    disabled={resetLoading}
                    onClick={() => setIsResetModalOpen(false)}
                    className="text-xs font-bold text-wood-900/40 hover:text-wood-900/60 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="text-xs font-bold text-white bg-engawa-600 hover:bg-engawa-700 disabled:opacity-50 px-5 py-2 rounded-xl shadow shadow-engawa-600/10 hover:shadow-engawa-600/25 transition-all active:scale-95 font-soft"
                  >
                    {resetLoading ? '送信中...' : '送信する'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
