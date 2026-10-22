import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
} from '../schemas/auth.schema';
import { PAYS } from '../lib/constants';
import { getAuthErrorMessage } from '../lib/auth-errors';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [audience, setAudience] = useState<'user' | 'admin'>(
    searchParams.get('mode') === 'admin' ? 'admin' : 'user'
  );
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const processedConfirmationToken = useRef<string | null>(null);
  const { login, register: authRegister, logout } = useAuth();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    setAudience(requestedMode === 'admin' ? 'admin' : 'user');
    if (requestedMode === 'admin') {
      setTab('login');
    } else if (searchParams.get('tab') === 'register') {
      setTab('register');
    } else if (requestedMode === 'user') {
      setTab('login');
    }
    if (searchParams.get('confirmed') === '1') {
      setAuthSuccess('Votre adresse e-mail est confirmée. Vous pouvez maintenant vous connecter.');
    }
  }, [searchParams]);

  useEffect(() => {
    const confirmationError = searchParams.get('error') || searchParams.get('error_description');
    if (confirmationError) {
      setAuthError('Le lien de confirmation est invalide ou a expiré. Demandez un nouvel e-mail de confirmation.');
      setAuthSuccess('');
      return;
    }

    const tokenHash = searchParams.get('token_hash');
    if (tokenHash) {
      if (processedConfirmationToken.current === tokenHash) return;
      processedConfirmationToken.current = tokenHash;

      const type = searchParams.get('type');
      if (type !== 'email' && type !== 'signup') {
        setAuthError('Le lien de confirmation est invalide. Demandez un nouvel e-mail de confirmation.');
        navigate('/login', { replace: true });
        return;
      }

      void authService.confirmEmail(tokenHash, type)
        .then(({ data }) => {
          if (data.session) {
            navigate('/dashboard', { replace: true });
            return;
          }
          setAuthSuccess('Votre adresse e-mail est confirmée. Vous pouvez maintenant vous connecter.');
          navigate('/login?confirmed=1', { replace: true });
        })
        .catch((error: unknown) => {
          setAuthError(getAuthErrorMessage(error, 'register'));
          setAuthSuccess('');
          navigate('/login', { replace: true });
        });
    }
  }, [navigate, searchParams]);

  // Formulaire Connexion
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Formulaire Inscription
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      country: '',
      acceptTerms: false,
    },
  });

  // Formulaire Mot de passe oublié
  const forgotForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setAuthError('');
    setAuthSuccess('');
    try {
      const role = await login(data);
      if (audience === 'admin' && role !== 'admin') {
        await logout();
        setAuthError('Ce compte ne possède pas les droits administrateur. Utilisez un compte admin autorisé ou choisissez la connexion utilisateur.');
        return;
      }
      navigate(from || (role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (err: unknown) {
      setAuthError(getAuthErrorMessage(err, 'login'));
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setAuthError('');
    setAuthSuccess('');
    try {
      const hasSession = await authRegister(data);
      if (hasSession) {
        setAuthSuccess('Votre compte a été créé avec succès !');
        navigate('/dashboard', { replace: true });
      } else {
        setAuthSuccess('Votre compte a été créé. Consultez votre boîte e-mail et confirmez votre adresse avant de vous connecter.');
        setTab('login');
      }
    } catch (err: unknown) {
      setAuthError(getAuthErrorMessage(err, 'register'));
    }
  };

  const onForgotSubmit = async (data: ForgotPasswordFormData) => {
    setAuthError('');
    setAuthSuccess('');
    try {
      await authService.requestPasswordReset(data.email);
      setAuthSuccess('Un lien de réinitialisation a été envoyé à votre adresse e-mail.');
    } catch (err: unknown) {
      setAuthError(getAuthErrorMessage(err, 'reset'));
    }
  };

  return (
    <div className="mx-auto my-8 max-w-xl px-1 pb-16 sm:my-12">
      <div className="overflow-hidden rounded-3xl border border-palabre-border bg-white p-6 shadow-[0_24px_70px_-32px_rgba(20,50,40,0.32)] sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-palabre-primary text-white shadow-lg shadow-emerald-900/15">
            {tab === 'login' && <LogIn size={24} />}
            {tab === 'register' && <UserPlus size={24} />}
            {tab === 'forgot' && <KeyRound size={24} />}
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-palabre-primary">
            PALABRE · LA COMMUNAUTÉ TECHNIQUE
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-palabre-text sm:text-3xl">
            {tab === 'login' && (audience === 'admin' ? 'Accès administrateur' : 'Bon retour sur Palabre')}
            {tab === 'register' && 'Rejoindre la communauté'}
            {tab === 'forgot' && 'Réinitialiser votre mot de passe'}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-palabre-muted">
            {tab === 'login' && (audience === 'admin'
              ? 'Connectez-vous avec votre compte administrateur Palabre.'
              : 'Connectez-vous pour retrouver vos fiches, favoris et confirmations.')}
            {tab === 'register' && 'Partagez vos solutions techniques avec les devs africains.'}
            {tab === 'forgot' && 'Saisissez votre e-mail pour recevoir le lien de réinitialisation.'}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
            <span>
              <strong className="block">Connexion temporairement indisponible</strong>
              Le projet Supabase n’est pas configuré. Ajoutez son URL et sa clé publique dans
              {' '}<code className="rounded bg-amber-100 px-1">.env.local</code>, puis redémarrez l’application.
            </span>
          </div>
        )}

        {tab === 'login' && (
          <section className="mb-6" aria-label="Choisir un espace de connexion">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Choisissez votre espace
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={audience === 'user'}
                onClick={() => {
                  setAudience('user');
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className={`group flex min-h-[76px] items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                  audience === 'user'
                    ? 'border-palabre-primary bg-palabre-primaryLight ring-2 ring-palabre-primary/10'
                    : 'border-slate-200 bg-white hover:border-palabre-primary/40 hover:bg-slate-50'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  audience === 'user' ? 'bg-palabre-primary text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <UserRound size={19} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-palabre-text">Utilisateur</span>
                  <span className="mt-0.5 block text-[11px] text-palabre-muted">Mon espace</span>
                </span>
              </button>
              <button
                type="button"
                aria-pressed={audience === 'admin'}
                onClick={() => {
                  setAudience('admin');
                  setTab('login');
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className={`group flex min-h-[76px] items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                  audience === 'admin'
                    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/10'
                    : 'border-slate-200 bg-white hover:border-amber-400/60 hover:bg-amber-50/50'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  audience === 'admin' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'
                }`}>
                  <ShieldCheck size={20} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-palabre-text">Administrateur</span>
                  <span className="mt-0.5 block text-[11px] text-palabre-muted">Accès sécurisé</span>
                </span>
              </button>
            </div>
            {audience === 'admin' && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                <LockKeyhole size={15} className="mt-0.5 shrink-0 text-palabre-primary" aria-hidden="true" />
                Le rôle administrateur est vérifié de façon sécurisée après connexion. Ce choix ne modifie pas les autorisations du compte.
              </p>
            )}
          </section>
        )}

        {/* Onglets */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1.5 mb-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setAuthError('');
              setAuthSuccess('');
            }}
            className={`min-h-10 rounded-lg transition-colors cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-palabre-text shadow-sm'
                : 'text-palabre-muted hover:text-palabre-text'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            disabled={audience === 'admin'}
            onClick={() => {
              setTab('register');
              setAuthError('');
              setAuthSuccess('');
            }}
            className={`min-h-10 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              tab === 'register'
                ? 'bg-white text-palabre-text shadow-sm'
                : 'text-palabre-muted hover:text-palabre-text'
            }`}
          >
            Créer un compte
          </button>
        </div>

        {authError && (
          <div role="alert" className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {authSuccess && (
          <div role="status" className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{authSuccess}</span>
          </div>
        )}

        {/* Tab 1 : Connexion */}
        {tab === 'login' && (
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Adresse e-mail
              </label>
              <input
                type="email"
                placeholder="dev@exemple.africa"
                {...loginForm.register('email')}
                className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                  loginForm.formState.errors.email ? 'border-red-500' : 'border-palabre-border'
                }`}
              />
              {loginForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-palabre-text">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTab('forgot');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                  className="text-xs text-palabre-primary hover:underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...loginForm.register('password')}
                  className={`w-full px-3 py-2 pr-11 bg-palabre-bg border rounded-btn text-sm ${
                    loginForm.formState.errors.password ? 'border-red-500' : 'border-palabre-border'
                  }`}
                />
                <button
                  type="button"
                  aria-label={showLoginPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={showLoginPassword}
                  onClick={() => setShowLoginPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-palabre-muted hover:text-palabre-text"
                >
                  {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full py-2.5 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-sm font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loginForm.formState.isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
        )}

        {/* Tab 2 : Inscription */}
        {tab === 'register' && (
          <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Nom d'affichage *
              </label>
              <input
                type="text"
                placeholder="Mouhamed Tine"
                {...registerForm.register('displayName')}
                className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                  registerForm.formState.errors.displayName ? 'border-red-500' : 'border-palabre-border'
                }`}
              />
              {registerForm.formState.errors.displayName && (
                <p className="text-xs text-red-500 mt-1">
                  {registerForm.formState.errors.displayName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Nom d'utilisateur (unique) *
              </label>
              <input
                type="text"
                placeholder="tine_dev"
                {...registerForm.register('username')}
                className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                  registerForm.formState.errors.username ? 'border-red-500' : 'border-palabre-border'
                }`}
              />
              {registerForm.formState.errors.username && (
                <p className="text-xs text-red-500 mt-1">
                  {registerForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Adresse e-mail *
              </label>
              <input
                type="email"
                placeholder="tine@exemple.com"
                {...registerForm.register('email')}
                className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                  registerForm.formState.errors.email ? 'border-red-500' : 'border-palabre-border'
                }`}
              />
              {registerForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {registerForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Pays de résidence (facultatif)
              </label>
              <select
                {...registerForm.register('country')}
                className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
              >
                <option value="">Sélectionner</option>
                {PAYS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-palabre-text mb-1">
                  Mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    placeholder="8 caractères min."
                    {...registerForm.register('password')}
                    className={`w-full px-3 py-2 pr-11 bg-palabre-bg border rounded-btn text-sm ${
                      registerForm.formState.errors.password ? 'border-red-500' : 'border-palabre-border'
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={showRegisterPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={showRegisterPassword}
                    onClick={() => setShowRegisterPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-palabre-muted hover:text-palabre-text"
                  >
                    {showRegisterPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-red-500 mt-1">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-palabre-text mb-1">
                  Confirmation *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Répétez"
                    {...registerForm.register('confirmPassword')}
                    className={`w-full px-3 py-2 pr-11 bg-palabre-bg border rounded-btn text-sm ${
                      registerForm.formState.errors.confirmPassword ? 'border-red-500' : 'border-palabre-border'
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={showConfirmPassword}
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-palabre-muted hover:text-palabre-text"
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2 text-xs text-palabre-muted cursor-pointer">
                <input
                  type="checkbox"
                  {...registerForm.register('acceptTerms')}
                  className="mt-0.5 rounded text-palabre-primary focus:ring-palabre-primary"
                />
                <span>
                  J'accepte la charte communautaire et m'engage à ne jamais publier de clés d'API ou informations confidentielles réelles.
                </span>
              </label>
              {registerForm.formState.errors.acceptTerms && (
                <p className="text-xs text-red-500 mt-1">
                  {registerForm.formState.errors.acceptTerms.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={registerForm.formState.isSubmitting}
              className="w-full py-2.5 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-sm font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {registerForm.formState.isSubmitting ? 'Création en cours...' : 'Créer mon compte'}
            </button>
          </form>
        )}

        {/* Tab 3 : Mot de passe oublié */}
        {tab === 'forgot' && (
          <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Adresse e-mail
              </label>
              <input
                type="email"
                placeholder="dev@exemple.africa"
                {...forgotForm.register('email')}
                className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                  forgotForm.formState.errors.email ? 'border-red-500' : 'border-palabre-border'
                }`}
              />
              {forgotForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {forgotForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={forgotForm.formState.isSubmitting}
              className="w-full py-2.5 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-sm font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {forgotForm.formState.isSubmitting ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setTab('login')}
                className="text-xs text-palabre-primary hover:underline cursor-pointer"
              >
                Retour à la connexion
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
