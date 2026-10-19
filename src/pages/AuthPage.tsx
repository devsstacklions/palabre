import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { LogIn, UserPlus, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const { login, register: authRegister } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

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
      await login(data);
      navigate(from, { replace: true });
    } catch (err: any) {
      setAuthError(err.message || 'Identifiant ou mot de passe incorrect.');
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setAuthError('');
    setAuthSuccess('');
    try {
      await authRegister(data);
      setAuthSuccess('Votre compte a été créé avec succès !');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err: any) {
      setAuthError(err.message || 'Erreur lors de la création du compte.');
    }
  };

  const onForgotSubmit = async (data: ForgotPasswordFormData) => {
    setAuthError('');
    setAuthSuccess('');
    try {
      await authService.requestPasswordReset(data.email);
      setAuthSuccess('Un lien de réinitialisation a été envoyé à votre adresse e-mail.');
    } catch (err: any) {
      setAuthError(err.message || 'Erreur lors de l’envoi du lien de récupération.');
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 pb-16">
      <div className="bg-white border border-palabre-border rounded-card p-6 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-palabre-primaryLight text-palabre-primary rounded-xl flex items-center justify-center mx-auto mb-3">
            {tab === 'login' && <LogIn size={24} />}
            {tab === 'register' && <UserPlus size={24} />}
            {tab === 'forgot' && <KeyRound size={24} />}
          </div>
          <h1 className="text-2xl font-bold text-palabre-text">
            {tab === 'login' && 'Connexion à Palabre'}
            {tab === 'register' && 'Rejoindre la communauté'}
            {tab === 'forgot' && 'Réinitialiser votre mot de passe'}
          </h1>
          <p className="text-xs text-palabre-muted mt-1">
            {tab === 'login' && 'Accédez à votre espace, vos brouillons et confirmations.'}
            {tab === 'register' && 'Partagez vos solutions techniques avec les devs africains.'}
            {tab === 'forgot' && 'Saisissez votre e-mail pour recevoir le lien de réinitialisation.'}
          </p>
        </div>

        {/* Onglets */}
        <div className="grid grid-cols-2 gap-1 bg-palabre-bg p-1 rounded-btn mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setAuthError('');
              setAuthSuccess('');
            }}
            className={`py-2 rounded transition-colors cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-palabre-text shadow-xs'
                : 'text-palabre-muted hover:text-palabre-text'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setAuthError('');
              setAuthSuccess('');
            }}
            className={`py-2 rounded transition-colors cursor-pointer ${
              tab === 'register'
                ? 'bg-white text-palabre-text shadow-xs'
                : 'text-palabre-muted hover:text-palabre-text'
            }`}
          >
            Créer un compte
          </button>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-btn flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {authSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-btn flex items-center gap-2">
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
              <input
                type="password"
                placeholder="••••••••"
                {...loginForm.register('password')}
                className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                  loginForm.formState.errors.password ? 'border-red-500' : 'border-palabre-border'
                }`}
              />
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
                placeholder="Awa Ndiaye"
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
                placeholder="awa_dev"
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
                placeholder="awa@exemple.com"
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
                <input
                  type="password"
                  placeholder="8 caractères min."
                  {...registerForm.register('password')}
                  className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                    registerForm.formState.errors.password ? 'border-red-500' : 'border-palabre-border'
                  }`}
                />
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
                <input
                  type="password"
                  placeholder="Répétez"
                  {...registerForm.register('confirmPassword')}
                  className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                    registerForm.formState.errors.confirmPassword ? 'border-red-500' : 'border-palabre-border'
                  }`}
                />
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
