import { isSupabaseConfigured } from './supabase';

type AuthAction = 'login' | 'register' | 'reset';

export const getAuthErrorMessage = (error: unknown, action: AuthAction): string => {
  if (!isSupabaseConfigured) {
    return 'Le service de connexion n’est pas configuré. Ajoutez l’URL et la clé publique du projet Supabase dans .env.local, puis redémarrez l’application.';
  }

  const errorObject = typeof error === 'object' && error !== null ? error : null;
  const message =
    error instanceof Error
      ? error.message
      : errorObject && 'message' in errorObject && typeof errorObject.message === 'string'
        ? errorObject.message
        : String(error);
  const normalized = message.toLowerCase();
  const code =
    errorObject && 'code' in errorObject && typeof errorObject.code === 'string'
      ? errorObject.code
      : '';

  if (
    code === 'PGRST205' ||
    normalized.includes('schema cache') ||
    normalized.includes('could not find the table') ||
    normalized.includes("public.user_roles")
  ) {
    return 'La base de données Palabre n’est pas configurée pour ce projet Supabase : la table des rôles est introuvable. Exécutez les migrations SQL du dossier supabase/migrations dans le projet indiqué par .env.local, puis vérifiez que le schéma public est exposé dans les paramètres Data API.';
  }

  if (
    normalized.includes('invalid api key') ||
    normalized.includes('api key') ||
    normalized.includes('unauthorized') ||
    normalized.includes('jwt')
  ) {
    return 'Le service d’authentification refuse la clé de cette application. Vérifiez l’URL et la clé publique Supabase dans .env.local.';
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('fetch')
  ) {
    return 'Le service d’authentification est injoignable. Vérifiez votre connexion Internet et la disponibilité de Supabase.';
  }

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials') ||
    normalized.includes('email not confirmed')
  ) {
    return normalized.includes('email not confirmed')
      ? 'Confirmez votre adresse e-mail avec le lien reçu avant de vous connecter.'
      : 'Adresse e-mail ou mot de passe incorrect.';
  }

  if (
    normalized.includes('token') &&
    (normalized.includes('expired') || normalized.includes('invalid'))
  ) {
    return 'Le lien de confirmation est invalide ou a expiré. Demandez un nouvel e-mail de confirmation.';
  }

  if (
    normalized.includes('user already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('already registered') ||
    normalized.includes('duplicate key')
  ) {
    return 'Un compte existe déjà avec cette adresse e-mail ou ce nom d’utilisateur.';
  }

  if (normalized.includes('password should be') || normalized.includes('weak password')) {
    return 'Choisissez un mot de passe plus robuste en respectant les exigences affichées.';
  }

  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Trop de tentatives ont été effectuées. Patientez quelques minutes avant de réessayer.';
  }

  if (action === 'register') return 'La création du compte a échoué. Vérifiez les informations et réessayez.';
  if (action === 'reset') return 'L’envoi du lien a échoué. Vérifiez votre adresse e-mail et réessayez.';
  return 'La connexion a échoué. Vérifiez vos identifiants et réessayez.';
};
