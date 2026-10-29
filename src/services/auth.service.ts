<<<<<<< HEAD
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { UserRoleType, Profile } from '../types';

const getAppOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:5173';
};

const requireAuthConfiguration = () => {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase n’est pas configuré. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans .env.local.'
    );
  }
};

=======
import { supabase } from '../lib/supabase';
import { UserRoleType, Profile } from '../types';

>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
export const authService = {
  async register(data: {
    email: string;
    password: string;
    username: string;
    displayName: string;
    country?: string;
<<<<<<< HEAD
    adminPortal?: boolean;
  }, confirmationPath = '/login?confirmed=1') {
    requireAuthConfiguration();
=======
  }) {
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
<<<<<<< HEAD
        emailRedirectTo: `${getAppOrigin()}${confirmationPath}`,
=======
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
        data: {
          username: data.username,
          display_name: data.displayName,
          country: data.country || '',
<<<<<<< HEAD
          palabre_portal: data.adminPortal ? 'admin' : 'user',
=======
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
        },
      },
    });

    if (error) throw error;
    return authData;
  },

<<<<<<< HEAD
  async confirmEmail(tokenHash: string, type: 'email' | 'signup') {
    requireAuthConfiguration();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) throw error;
    return { data };
  },

  async login(email: string, password: string) {
    requireAuthConfiguration();
=======
  async login(email: string, password: string) {
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async logout() {
<<<<<<< HEAD
    // End this browser session without revoking the administrator's other sessions.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
=======
    const { error } = await supabase.auth.signOut();
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
    if (error) throw error;
  },

  async requestPasswordReset(email: string) {
<<<<<<< HEAD
    requireAuthConfiguration();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppOrigin()}/reset-password`,
=======
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUserRole(userId: string): Promise<UserRoleType> {
<<<<<<< HEAD
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const roles = (data ?? []).map(({ role }) => role);
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('moderator')) return 'moderator';
    if (roles.includes('contributor')) return 'contributor';
    return 'user';
=======
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return 'user';
      return data.role as UserRoleType;
    } catch {
      return 'user';
    }
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
  },

  async getUserProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
<<<<<<< HEAD
      .select('id, username, display_name, avatar_url, country, bio, tech_stack, is_public, created_at, updated_at')
=======
      .select('*')
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erreur récupération profil:', error);
      return null;
    }
    return data;
  },
};
<<<<<<< HEAD
=======

>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
