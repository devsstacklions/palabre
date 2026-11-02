import { supabase } from '../lib/supabase';
import { FicheConfirmation } from '../types';
import { ConfirmationFormData } from '../schemas/interaction.schema';

export const confirmationService = {
  async getConfirmations(ficheId: string): Promise<FicheConfirmation[]> {
    try {
      const { data, error } = await supabase
        .from('fiche_confirmations')
        .select(`
          *,
          user:profiles!user_id (
            id,
            display_name,
            username,
            avatar_url,
            country
          )
        `)
        .eq('fiche_id', ficheId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erreur getConfirmations avec jointure profiles:', error);
        if (error.code === 'PGRST200') {
          const { data: raw, error: rawErr } = await supabase
            .from('fiche_confirmations')
            .select('*')
            .eq('fiche_id', ficheId)
            .order('created_at', { ascending: false });

          if (rawErr || !raw) return [];
          const userIds = [...new Set(raw.map((c) => c.user_id).filter(Boolean))];
          const { data: profiles } = userIds.length > 0
            ? await supabase.from('profiles').select('id, display_name, username, avatar_url, country').in('id', userIds)
            : { data: [] };
          const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
          return raw.map((c) => ({
            ...c,
            user: profileMap.get(c.user_id) || null,
          })) as FicheConfirmation[];
        }
        return [];
      }
      return (data || []) as FicheConfirmation[];
    } catch (err) {
      console.warn('Erreur inattendue getConfirmations:', err);
      return [];
    }
  },

  async getUserConfirmation(ficheId: string, userId: string): Promise<FicheConfirmation | null> {
    const { data, error } = await supabase
      .from('fiche_confirmations')
      .select('*')
      .eq('fiche_id', ficheId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erreur getUserConfirmation:', error);
      return null;
    }
    return data as FicheConfirmation | null;
  },

  async addConfirmation(
    ficheId: string,
    userId: string,
    formData: ConfirmationFormData
  ): Promise<FicheConfirmation> {
    const { data, error } = await supabase
      .from('fiche_confirmations')
      .upsert(
        {
          fiche_id: ficheId,
          user_id: userId,
          country: formData.country,
          operator_service: formData.operator_service,
          tested_version: formData.tested_version || null,
          test_context: formData.test_context || null,
          comment: formData.comment || null,
          is_working: formData.is_working,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'fiche_id,user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Erreur addConfirmation:', error);
      throw error;
    }
    return data as FicheConfirmation;
  },

  async deleteConfirmation(id: string): Promise<void> {
    const { error } = await supabase.from('fiche_confirmations').delete().eq('id', id);
    if (error) throw error;
  },

  async removeUserConfirmation(ficheId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('fiche_confirmations')
      .delete()
      .eq('fiche_id', ficheId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async hasUserConfirmed(ficheId: string, userId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('fiche_confirmations')
      .select('*', { count: 'exact', head: true })
      .eq('fiche_id', ficheId)
      .eq('user_id', userId);

    if (error) return false;
    return (count || 0) > 0;
  },
};
