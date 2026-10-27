import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPage } from '../pages/AuthPage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmEmail: vi.fn(),
  requestAdminAccess: vi.fn(),
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
    confirmEmail: mocks.confirmEmail,
  },
}));

vi.mock('../services/admin.service', () => ({
  adminService: {
    requestAdminAccess: mocks.requestAdminAccess,
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
        <Route path="/admin/login" element={<AuthPage />} />
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>
  );

describe('AuthPage connection choices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logout.mockResolvedValue(undefined);
    mocks.confirmEmail.mockResolvedValue({ data: { session: null } });
    mocks.requestAdminAccess.mockResolvedValue('pending');
  });

  it('affiche un portail admin indépendant avec demande de création de compte', () => {
    renderAuthPage('/admin/login');

    expect(screen.getByText('Portail d’administration')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Accès administrateur' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer un compte' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Connexion utilisateur/i })).not.toBeInTheDocument();
  });

  it('soumet une demande et ferme la session d’un compte non-admin sur le portail admin', async () => {
    mocks.login.mockResolvedValue('user');
    renderAuthPage('/admin/login');

    fireEvent.change(screen.getByPlaceholderText('dev@exemple.africa'), {
      target: { value: 'member@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password-valid' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Se connecter' }).at(-1)!);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Votre demande d’accès administrateur est en attente de validation.'
    );
    expect(mocks.requestAdminAccess).toHaveBeenCalledOnce();
    expect(mocks.logout).toHaveBeenCalledOnce();
  });

  it('crée un compte depuis le portail admin puis transmet la demande pour approbation', async () => {
    mocks.register.mockResolvedValue(true);
    renderAuthPage('/admin/login');
    fireEvent.click(screen.getByRole('button', { name: 'Créer un compte' }));

    fireEvent.change(screen.getByPlaceholderText('Mouhamed Tine'), {
      target: { value: 'Admin en attente' },
    });
    fireEvent.change(screen.getByPlaceholderText('tine_dev'), {
      target: { value: 'admin_en_attente' },
    });
    fireEvent.change(screen.getByPlaceholderText('tine@exemple.com'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('8 caractères min.'), {
      target: { value: 'password-valid' },
    });
    fireEvent.change(screen.getByPlaceholderText('Répétez'), {
      target: { value: 'password-valid' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Créer le compte et demander l’accès' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'votre demande d’accès administrateur est envoyée'
    );
    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'admin@example.com' }),
      '/admin/login?confirmed=1'
    );
    expect(mocks.requestAdminAccess).toHaveBeenCalledOnce();
    expect(mocks.logout).toHaveBeenCalledOnce();
  });

  it('redirige un administrateur authentifié vers la console admin', async () => {
    mocks.login.mockResolvedValue('admin');
    renderAuthPage('/admin/login');

    fireEvent.change(screen.getByPlaceholderText('dev@exemple.africa'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password-valid' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Se connecter' }).at(-1)!);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('/admin'));
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it('refuse le portail utilisateur à un administrateur et ferme sa session', async () => {
    mocks.login.mockResolvedValue('admin');
    renderAuthPage('/login?mode=user');

    fireEvent.change(screen.getByPlaceholderText('dev@exemple.africa'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password-valid' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Se connecter' }).at(-1)!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce compte est administrateur. Connectez-vous depuis l’espace administrateur.'
    );
    expect(mocks.logout).toHaveBeenCalledOnce();
  });

  it('affiche ou masque le mot de passe sur l’écran de connexion', () => {
    renderAuthPage('/login');
    expect(screen.queryByText('Portail d’administration')).not.toBeInTheDocument();
    const password = screen.getByPlaceholderText('••••••••');

    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(password).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('vérifie un lien de confirmation avec token hash', async () => {
    renderAuthPage('/login?token_hash=valid-token&type=signup');

    await waitFor(() => expect(mocks.confirmEmail).toHaveBeenCalledWith('valid-token', 'signup'));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Votre adresse e-mail est confirmée.'
    );
  });

  it('signale un lien de confirmation expiré', async () => {
    mocks.confirmEmail.mockRejectedValue(new Error('Token has expired or is invalid'));
    renderAuthPage('/login?token_hash=expired-token&type=email');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Le lien de confirmation est invalide ou a expiré.'
    );
  });
});
