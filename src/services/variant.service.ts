import { supabase } from '../lib/supabase';
import { FicheVariant } from '../types';
import { VariantFormData } from '../schemas/interaction.schema';

export const variantService = {
  async getVariants(ficheId: string): Promise<FicheVariant[]> {
    try {
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
        console.warn('Erreur getVariants avec jointure profiles:', error);
        if (error.code === 'PGRST200') {
          const { data: raw, error: rawErr } = await supabase
            .from('fiche_variants')
            .select('*')
            .eq('fiche_id', ficheId)
            .order('created_at', { ascending: false });

          if (rawErr || !raw) return [];
          const authorIds = [...new Set(raw.map((v) => v.author_id).filter(Boolean))];
          const { data: profiles } = authorIds.length > 0
            ? await supabase.from('profiles').select('id, display_name, username, avatar_url, country').in('id', authorIds)
            : { data: [] };
          const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
          return raw.map((v) => ({
            ...v,
            author: profileMap.get(v.author_id) || null,
          })) as FicheVariant[];
        }
        return [];
      }
      return (data || []) as FicheVariant[];
    } catch (err) {
      console.warn('Erreur inattendue getVariants:', err);
      return [];
    }
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

