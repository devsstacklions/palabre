import { supabase } from '../lib/supabase';
import { Fiche } from '../types';

export const favoriteService = {
  async getUserFavorites(userId: string): Promise<Fiche[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        fiche_id,
        fiche:fiches (
          *,
          author:profiles!author_id (
            id,
            display_name,
            username,
            avatar_url,
            country
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur getUserFavorites:', error);
      throw error;
    }

    return (data || [])
      .map((item: any) => item.fiche)
      .filter((fiche: any) => Boolean(fiche) && fiche.status === 'published') as Fiche[];
  },

  async addFavorite(ficheId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .insert({
        fiche_id: ficheId,
        user_id: userId,
      });

    if (error && error.code !== '23505') {
      console.error('Erreur addFavorite:', error);
      throw error;
    }
  },

  async removeFavorite(ficheId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('fiche_id', ficheId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur removeFavorite:', error);
      throw error;
    }
  },

  async isFavorite(ficheId: string, userId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('fiche_id', ficheId)
      .eq('user_id', userId);

    if (error) return false;
    return (count || 0) > 0;
  },
};

