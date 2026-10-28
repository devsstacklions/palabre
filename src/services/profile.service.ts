import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { ProfileUpdateFormData } from '../schemas/auth.schema';

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erreur getProfile:', error);
      return null;
    }
    return data as Profile | null;
  },

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Erreur getProfileByUsername:', error);
      return null;
    }
    return data as Profile | null;
  },

  async updateProfile(userId: string, data: ProfileUpdateFormData): Promise<Profile> {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        display_name: data.displayName.trim(),
        country: data.country || null,
        bio: data.bio?.trim() || null,
        tech_stack: data.techStack,
        is_public: data.isPublic,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erreur updateProfile:', error);
      throw error;
    }
    return updated as Profile;
  },

  async ensureProfile(user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, any>;
  }): Promise<Profile> {
    const existing = await this.getProfile(user.id);
    if (existing) return existing;

    const metadata = user.user_metadata || {};
    const emailPrefix = user.email ? user.email.split('@')[0] : 'dev';
    const fallbackUsername = (metadata.username || emailPrefix || `user_${user.id.slice(0, 6)}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    const fallbackDisplayName = metadata.display_name || metadata.name || emailPrefix || 'Développeur';
    const fallbackCountry = metadata.country || null;

    const newProfile = {
      id: user.id,
      username: fallbackUsername,
      display_name: fallbackDisplayName,
      country: fallbackCountry,
      tech_stack: [] as string[],
      is_public: true,
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(newProfile, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Tentative d’upsert du profil échouée:', error.message);
      if (error.code === '23505') {
        const uniqueUsername = `${fallbackUsername}_${user.id.slice(0, 5)}`;
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .upsert({ ...newProfile, username: uniqueUsername }, { onConflict: 'id' })
          .select()
          .single();
        if (!retryError && retryData) return retryData as Profile;
      }
      return {
        ...newProfile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile;
    }

    return data as Profile;
  },
};

