import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SetupFamilyPage } from './pages/SetupFamilyPage';
import { HomePage } from './pages/HomePage';
import { PostDetailPage } from './pages/PostDetailPage';
import { usePushNotifications } from './hooks/usePushNotifications';

// Protected Route Wrapper for general authentication
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wood-100 text-engawa-800 font-bold font-soft">
        庭の手入れをしています...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  // Initialize push notification subscriptions when user is logged in
  usePushNotifications();

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
