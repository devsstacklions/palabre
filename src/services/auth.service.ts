import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { UserRoleType, Profile } from '../types';

const requireAuthConfiguration = () => {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase n’est pas configuré. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans .env.local.'
    );
  }
};

export const authService = {
  async register(data: {
    email: string;
    password: string;
    username: string;
    displayName: string;
    country?: string;
  }) {
    requireAuthConfiguration();
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          display_name: data.displayName,
          country: data.country || '',
        },
      },
    });

    if (error) throw error;
    return authData;
  },

  async login(email: string, password: string) {
    requireAuthConfiguration();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async requestPasswordReset(email: string) {
    requireAuthConfiguration();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
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
  },

  async getUserProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, country, bio, tech_stack, is_public, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erreur récupération profil:', error);
      return null;
    }
    return data;
  },
};
