import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isAdmin: false,
  isModerator: false,
  isLoading: false,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

const CurrentPath = () => <output>{useLocation().pathname}</output>;

const renderProtectedRoutes = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <p>User portal</p>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <p>Admin portal</p>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<CurrentPath />} />
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute role separation', () => {
  beforeEach(() => {
    auth.user = { id: 'user-1' };
    auth.isAdmin = false;
    auth.isModerator = false;
    auth.isLoading = false;
  });

  it('redirige un administrateur vers sa console depuis une route utilisateur', () => {
    auth.isAdmin = true;

    renderProtectedRoutes('/dashboard');

    expect(screen.getByText('Admin portal')).toBeInTheDocument();
    expect(screen.queryByText('User portal')).not.toBeInTheDocument();
  });

  it('empêche un utilisateur standard d’afficher la console admin', () => {
    renderProtectedRoutes('/admin');

    expect(screen.getByText('Accès non autorisé')).toBeInTheDocument();
    expect(screen.queryByText('Admin portal')).not.toBeInTheDocument();
  });

  it('autorise un utilisateur standard dans son espace', () => {
    renderProtectedRoutes('/dashboard');

    expect(screen.getByText('User portal')).toBeInTheDocument();
  });
});
