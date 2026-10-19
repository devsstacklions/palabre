import { supabase } from '../lib/supabase';
import { FicheConfirmation } from '../types';
import { ConfirmationFormData } from '../schemas/interaction.schema';

export const confirmationService = {
  async getConfirmations(ficheId: string): Promise<FicheConfirmation[]> {
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
      console.error('Erreur getConfirmations:', error);
      throw error;
    }
    return (data || []) as FicheConfirmation[];
  },

  async addConfirmation(
    ficheId: string,
    userId: string,
    formData: ConfirmationFormData
  ): Promise<FicheConfirmation> {
    const { data, error } = await supabase
      .from('fiche_confirmations')
      .insert({
        fiche_id: ficheId,
        user_id: userId,
        country: formData.country,
        operator_service: formData.operator_service,
        tested_version: formData.tested_version || null,
        test_context: formData.test_context || null,
        comment: formData.comment || null,
        is_working: formData.is_working,
      })
      .select()
      .single();

    if (error) {
      // Cas de contrainte d'unicité (déjà confirmé pour ce pays/opérateur)
      if (error.code === '23505') {
        throw new Error('Vous avez déjà confirmé cette solution pour ce pays et cet opérateur.');
      }
      console.error('Erreur addConfirmation:', error);
      throw error;
    }
    return data as FicheConfirmation;
  },

  async deleteConfirmation(id: string): Promise<void> {
    const { error } = await supabase.from('fiche_confirmations').delete().eq('id', id);
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

