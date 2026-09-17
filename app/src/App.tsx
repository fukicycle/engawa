import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SetupFamilyPage } from './pages/SetupFamilyPage';
import { HomePage } from './pages/HomePage';
import { PostDetailPage } from './pages/PostDetailPage';
import { usePushNotifications } from './hooks/usePushNotifications';
import { hideSplash } from './utils/splash';

// Protected Route Wrapper for general authentication
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  // 認証の復元中は何も描画しない。
  // index.html の起動スプラッシュがそのまま残るため、
  // 「スプラッシュ → 全画面ローディング → 本体」という多段の切り替えが起きない。
  if (loading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const { loading } = useAuth();

  // Initialize push notification subscriptions when user is logged in
  usePushNotifications();

  // 認証状態が確定した時点で、アプリ本体の描画と重ねてスプラッシュを閉じる
  useEffect(() => {
    if (!loading) {
      hideSplash();
    }
  }, [loading]);

  return (
    <HashRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/landing" element={<LandingPage />} />

        {/* Login Page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Setup Family Profile (Guarded) */}
        <Route 
          path="/setup-family" 
          element={
            <ProtectedRoute>
              <SetupFamilyPage />
            </ProtectedRoute>
          } 
        />

        {/* HomePage Hub (Guarded) */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } 
        />

        {/* Thread Details (Guarded) */}
        <Route 
          path="/post/:postId" 
          element={
            <ProtectedRoute>
              <PostDetailPage />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
