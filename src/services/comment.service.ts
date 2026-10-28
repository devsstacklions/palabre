import { supabase } from '../lib/supabase';
import { FicheComment } from '../types';

export const commentService = {
  async getComments(ficheId: string): Promise<FicheComment[]> {
    try {
      const { data, error } = await supabase
        .from('fiche_comments')
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
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Erreur getComments avec jointure profiles:', error);
        if (error.code === 'PGRST200') {
          const { data: raw, error: rawErr } = await supabase
            .from('fiche_comments')
            .select('*')
            .eq('fiche_id', ficheId)
            .order('created_at', { ascending: true });

          if (rawErr || !raw) return [];
          const userIds = [...new Set(raw.map((c) => c.user_id).filter(Boolean))];
          const { data: profiles } = userIds.length > 0
            ? await supabase.from('profiles').select('id, display_name, username, avatar_url, country').in('id', userIds)
            : { data: [] };
          const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
          return raw.map((c) => ({
            ...c,
            user: profileMap.get(c.user_id) || null,
          })) as FicheComment[];
        }
        return [];
      }
      return (data || []) as FicheComment[];
    } catch (err) {
      console.warn('Erreur inattendue getComments:', err);
      return [];
    }
  },

  async addComment(ficheId: string, userId: string, content: string): Promise<FicheComment> {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Le commentaire ne peut pas être vide.');

    const { data, error } = await supabase
      .from('fiche_comments')
      .insert({
        fiche_id: ficheId,
        user_id: userId,
        content: trimmed,
      })
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
      .single();

    if (error) {
      console.error('Erreur addComment:', error);
      throw error;
    }
    return data as FicheComment;
  },

  async deleteComment(id: string): Promise<void> {
    const { error } = await supabase.from('fiche_comments').delete().eq('id', id);
    if (error) {
      console.error('Erreur deleteComment:', error);
      throw error;
    }
  },
};
