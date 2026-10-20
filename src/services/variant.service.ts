import { supabase } from '../lib/supabase';
import { FicheVariant } from '../types';
import { VariantFormData } from '../schemas/interaction.schema';

export const variantService = {
  async getVariants(ficheId: string): Promise<FicheVariant[]> {
    const { data, error } = await supabase
      .from('fiche_variants')
      .select(`
        *,
        author:profiles!author_id (
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
      console.error('Erreur getVariants:', error);
      throw error;
    }
    return (data || []) as FicheVariant[];
  },

  async addVariant(
    ficheId: string,
    authorId: string,
    formData: VariantFormData
  ): Promise<FicheVariant> {
    const { data, error } = await supabase
      .from('fiche_variants')
      .insert({
        fiche_id: ficheId,
        author_id: authorId,
        title: formData.title.trim(),
        country: formData.country,
        operator_service: formData.operator_service,
        differences: formData.differences.trim(),
        code_snippet: formData.code_snippet?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur addVariant:', error);
      throw error;
    }
    return data as FicheVariant;
  },

  async deleteVariant(id: string): Promise<void> {
    const { error } = await supabase.from('fiche_variants').delete().eq('id', id);
    if (error) throw error;
  },
};

