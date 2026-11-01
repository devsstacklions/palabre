import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';

import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { FicheDetailPage } from './pages/FicheDetailPage';
import { NewFichePage } from './pages/NewFichePage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminModerationPage } from './pages/AdminModerationPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { HelpPage } from './pages/HelpPage';
import { AuthPage } from './pages/AuthPage';

import { EntraideListPage } from './pages/EntraideListPage';
import { EntraideDetailPage } from './pages/EntraideDetailPage';
import { NewQuestionPage } from './pages/NewQuestionPage';

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
    <div
      className={`flex min-h-screen flex-col ${
        isAdminArea
          ? 'bg-slate-50 text-slate-900'
          : 'bg-palabre-bg text-palabre-text'
      }`}
    >
      {!isAdminArea && <Header />}

      <main
        className={`flex-1 w-full ${
          isAdminArea ? '' : 'max-w-7xl mx-auto px-4 py-6 sm:px-6'
        }`}
      >
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/fiches/:id" element={<FicheDetailPage />} />
          <Route path="/entraide" element={<EntraideListPage />} />
          <Route path="/entraide/:id" element={<EntraideDetailPage />} />
          <Route path="/help" element={<HelpPage />} />

          <Route
            path="/login"
            element={
              new URLSearchParams(location.search).get('mode') === 'admin' ? (
                <Navigate to="/admin/login" replace />
              ) : (
                <AuthPage />
              )
            }
          />
          <Route path="/admin/login" element={<AuthPage />} />

          {/* Création et modification : entraide */}
          <Route
            path="/entraide/new"
            element={
              <ProtectedRoute>
                <NewQuestionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entraide/:id/edit"
            element={
              <ProtectedRoute>
                <NewQuestionPage />
              </ProtectedRoute>
            }
          />

          {/* Création et modification : fiches */}
          <Route
            path="/fiches/new"
            element={
              <ProtectedRoute>
                <NewFichePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fiches/:id/edit"
            element={
              <ProtectedRoute>
                <NewFichePage />
              </ProtectedRoute>
            }
          />

          {/* Espace utilisateur */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {isAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <DashboardPage />
                )}
              </ProtectedRoute>
            }
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

          {/* Administration */}
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

          {/* Compatibilité avec l'ancienne route de modération */}
          <Route
            path="/moderation"
            element={
              <ProtectedRoute requireModerator>
                <AdminModerationPage />
              </ProtectedRoute>
            }
          />

          {/* Route inconnue */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isAdminArea && <Footer />}
    </div>
  );
};

export default App;

