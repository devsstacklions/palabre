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
};

