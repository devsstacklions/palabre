import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPage } from '../pages/AuthPage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mocks.login,
    logout: mocks.logout,
    register: mocks.register,
  }),
}));

vi.mock('../services/auth.service', () => ({
  authService: {
    requestPasswordReset: mocks.requestPasswordReset,
  },
}));

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}));

const CurrentPath = () => <output>{useLocation().pathname}</output>;

const renderAuthPage = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>
  );

describe('AuthPage connection choices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logout.mockResolvedValue(undefined);
  });

  it('affiche les espaces utilisateur et admin, et sélectionne le mode admin via le lien', () => {
    renderAuthPage('/login?mode=admin');

    expect(screen.getByRole('button', { name: /Utilisateur Mon espace/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(
      screen.getByRole('button', { name: /Administrateur Accès sécurisé/i })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Ce choix ne modifie pas les autorisations du compte/i)).toBeInTheDocument();
  });

  it('refuse le portail admin à un compte non administrateur et ferme sa session', async () => {
    mocks.login.mockResolvedValue('user');
    renderAuthPage('/login?mode=admin');

    fireEvent.change(screen.getByPlaceholderText('dev@exemple.africa'), {
      target: { value: 'member@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password-valid' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Se connecter' })[1]);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce compte ne possède pas les droits administrateur.'
    );
    expect(mocks.logout).toHaveBeenCalledOnce();
  });

  it('redirige un administrateur authentifié vers la console admin', async () => {
    mocks.login.mockResolvedValue('admin');
    renderAuthPage('/login?mode=admin');

    fireEvent.change(screen.getByPlaceholderText('dev@exemple.africa'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password-valid' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Se connecter' })[1]);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('/admin'));
    expect(mocks.logout).not.toHaveBeenCalled();
  });
});
