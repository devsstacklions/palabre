import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { FicheDetailPage } from './pages/FicheDetailPage';
import { NewFichePage } from './pages/NewFichePage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminModerationPage } from './pages/AdminModerationPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { HelpPage } from './pages/HelpPage';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './contexts/AuthContext';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const { user, isAdmin, isLoading } = useAuth();
  const isAdminArea = location.pathname.startsWith('/admin');

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-palabre-primary" />
      </div>
    );
  }

  if (user && isAdmin && location.pathname === '/admin/login') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className={`flex min-h-screen flex-col ${isAdminArea ? 'bg-slate-50 text-slate-900' : 'bg-palabre-bg text-palabre-text'}`}>
      {!isAdminArea && <Header />}
      <main className={`flex-1 w-full ${isAdminArea ? '' : 'max-w-7xl mx-auto px-4 py-6 sm:px-6'}`}>
        <Routes>
              {/* Routes Publiques */}
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/fiches/:id" element={<FicheDetailPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route
                path="/login"
                element={
                  new URLSearchParams(location.search).get('mode') === 'admin'
                    ? <Navigate to="/admin/login" replace />
                    : <AuthPage />
                }
              />
              <Route path="/admin/login" element={<AuthPage />} />

              {/* Routes Protégées Utilisateur */}
              <Route
                path="/fiches/new"
                element={
                  <ProtectedRoute>
                    <NewFichePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={<Navigate to={isAdmin ? '/admin' : '/search'} replace />}
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Routes distinctes d'administration et de modération */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout>
                      <AdminDashboardPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/moderation"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout>
                      <AdminModerationPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout>
                      <AdminUsersPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/moderation"
                element={
                  <ProtectedRoute requireModerator>
                    <AdminModerationPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAdminArea && <Footer />}
    </div>
  );
};

export default App;
