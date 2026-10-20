import { supabase } from '../lib/supabase';
import { Category } from '../types';

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Erreur getCategories:', error);
      return [];
    }
    return (data || []) as Category[];
  },
};

