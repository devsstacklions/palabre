
import { supabase } from '../lib/supabase';
import { Fiche, SearchFilters } from '../types';
import { FicheFormData } from '../schemas/fiche.schema';
import { profileService } from './profile.service';

export const ficheService = {
  async getFiches(filters: SearchFilters = {}): Promise<Fiche[]> {
    let query = supabase
      .from('fiches')
      .select(`
        *,
        author:profiles!author_id (
          id,
          display_name,
          username,
          avatar_url,
          country
        ),
        category:categories (
          id,
          name,
          slug,
          icon
        )
      `)
      .eq('status', 'published');

    if (filters.country) {
      query = query.eq('country', filters.country);
    }

    if (filters.operator) {
      query = query.eq('operator_service', filters.operator);
    }

    if (filters.technology) {
      query = query.eq('language', filters.technology);
    }

    if (filters.status) {
      query = query.eq('verification_status', filters.status);
    }

    if (filters.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters.query && filters.query.trim().length > 0) {
      const q = filters.query.trim();

      query = query.or(
        `title.ilike.%${q}%,problem.ilike.%${q}%,operator_service.ilike.%${q}%,language.ilike.%${q}%,country.ilike.%${q}%`
      );
    }

    if (filters.sortBy === 'confirmations') {
      query = query.order('confirmations_count', {
        ascending: false,
      });
    } else {
      query = query.order('created_at', {
        ascending: false,
      });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur getFiches :', error);
      if (error.code === 'PGRST200') {
        const { data: rawFiches, error: fallbackError } = await supabase
          .from('fiches')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        return (rawFiches || []) as Fiche[];
      }
      throw error;
    }

    return (data || []) as Fiche[];
  },

  async getFicheById(id: string): Promise<Fiche | null> {
    const { data, error } = await supabase
      .from('fiches')
      .select(`
        *,
        author:profiles!author_id (
          id,
          display_name,
          username,
          avatar_url,
          country,
          bio
        ),
        category:categories (
          id,
          name,
          slug
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn('Erreur getFicheById avec jointure PostgREST:', error);
      if (error.code === 'PGRST200') {
        const { data: rawFiche, error: fallbackError } = await supabase
          .from('fiches')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (fallbackError || !rawFiche) {
          throw fallbackError || error;
        }

        const { data: authorProfile } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, country, bio')
          .eq('id', rawFiche.author_id)
          .maybeSingle();

        return {
          ...rawFiche,
          author: authorProfile || null,
        } as Fiche;
      }
      throw error;
    }

    return data as Fiche | null;
  },

  async createFiche(
    formData: FicheFormData,
    authorId: string
  ): Promise<Fiche> {
    // S'assurer que le profil de l'auteur existe dans public.profiles avant l'insertion
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user && authData.user.id === authorId) {
      try {
        await profileService.ensureProfile(authData.user);
      } catch (profileErr) {
        console.warn('Vérification profil avant insertion fiche:', profileErr);
      }
    }

    const stepsArray = formData.steps
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const { data, error } = await supabase
      .from('fiches')
      .insert({
        title: formData.title.trim(),
        short_description: formData.problem.slice(0, 160).trim(),
        problem: formData.problem.trim(),
        prerequisites: formData.prerequisites?.trim() || null,
        steps: stepsArray,
        code_snippet: formData.code_snippet?.trim() || '',
        language: formData.language,
        country: formData.country,
        operator_service: formData.operator_service,
        api_version: formData.api_version?.trim() || null,
        frequent_errors: formData.frequent_errors?.trim() || null,
        known_limits: formData.known_limits?.trim() || null,
        status: formData.status || 'published',
        verification_status: 'new',
        author_id: authorId,
        confirmations_count: 0,
        negative_feedback_count: 0,
        views_count: 0,
        comments_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur createFiche :', error);
      if (error.code === '23503') {
        throw new Error(
          "Impossible d'enregistrer la fiche : votre profil utilisateur n'a pas pu être validé en base de données. Veuillez actualiser la page ou vous reconnecter."
        );
      }
      if (error.code === '23505') {
        throw new Error(
          'Une fiche avec un titre ou des informations identiques existe déjà.'
        );
      }
      const detailedMessage = error.details
        ? `${error.message} (${error.details})`
        : error.message;
      throw new Error(detailedMessage || 'Erreur lors de l’enregistrement de la fiche.');
    }

    return data as Fiche;
  },

  async updateFiche(
    id: string,
    formData: Partial<FicheFormData>
  ): Promise<Fiche> {
    const updatePayload: Record<string, any> = { ...formData };

    if (formData.steps) {
      updatePayload.steps = formData.steps
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    if (formData.problem) {
      updatePayload.short_description = formData.problem
        .slice(0, 160)
        .trim();
    }

    const { data, error } = await supabase
      .from('fiches')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur updateFiche :', error);
      throw error;
    }

    return data as Fiche;
  },

  async deleteFiche(id: string): Promise<void> {
    const { error } = await supabase
      .from('fiches')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async getUserFiches(userId: string): Promise<Fiche[]> {
    const { data, error } = await supabase
      .from('fiches')
      .select('*')
      .eq('author_id', userId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as Fiche[];
  },

  async getUserDrafts(userId: string): Promise<Fiche[]> {
    const { data, error } = await supabase
      .from('fiches')
      .select('*')
      .eq('author_id', userId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as Fiche[];
  },

  async toggleFicheVisibility(
    id: string,
    isHidden: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('fiches')
      .update({
        status: isHidden ? 'hidden' : 'published',
      })
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  // Incrémente les consultations via la fonction SQL Supabase.
  // Les erreurs sont propagées à l'appelant pour être détectées.
  async incrementView(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_fiche_views', {
      p_fiche_id: id,
    });

    if (error) {
      console.error(
        'Impossible d’incrémenter les vues de la fiche :',
        error.message
      );

      throw error;
    }
  },
};
