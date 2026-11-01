
import { supabase } from '../lib/supabase';
import { Question, QuestionAnswer, QuestionFilters, QuestionReport } from '../types';
import { QuestionFormData, AnswerFormData } from '../schemas/entraide.schema';
import { profileService } from './profile.service';
import { TECHNOLOGIES } from '../lib/constants';

export const entraideService = {
  /**
   * Récupère la liste de toutes les technologies uniques (standards + personnalisées)
   */
  async getDistinctTechnologies(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('technology')
        .not('technology', 'is', null);

      if (error || !data) return [...TECHNOLOGIES];

      const customTechs = data
        .map((d) => d.technology?.trim())
        .filter((t): t is string => Boolean(t && t.length > 0));

      const combined = Array.from(new Set([...TECHNOLOGIES, ...customTechs]));
      return combined.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    } catch {
      return [...TECHNOLOGIES];
    }
  },

  /**
   * Récupère la liste des questions avec filtrage et recherche
   */
  async getQuestions(filters: QuestionFilters = {}): Promise<Question[]> {
    try {
      let query = supabase
        .from('questions')
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
        .not('status', 'in', '("draft","hidden")');

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.technology && filters.technology.trim().length > 0) {
        query = query.eq('technology', filters.technology.trim());
      }

      if (filters.query && filters.query.trim().length > 0) {
        const q = filters.query.trim();
        query = query.or(
          `title.ilike.%${q}%,description.ilike.%${q}%,error_message.ilike.%${q}%,technology.ilike.%${q}%,language.ilike.%${q}%,framework.ilike.%${q}%`
        );
      }

      if (filters.sortBy === 'views') {
        query = query.order('views_count', { ascending: false });
      } else if (filters.sortBy === 'unanswered') {
        query = query.eq('answers_count', 0).order('created_at', { ascending: false });
      } else if (filters.sortBy === 'resolved') {
        query = query.eq('status', 'resolved').order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Fallback getQuestions sans jointure imbriquée:', error);
        // Fallback sans jointure pour résister aux caches de schéma PostgREST
        let fallbackQuery = supabase
          .from('questions')
          .select('*')
          .not('status', 'in', '("draft","hidden")');

        if (filters.status && filters.status !== 'all') {
          fallbackQuery = fallbackQuery.eq('status', filters.status);
        }
        if (filters.technology && filters.technology.trim().length > 0) {
          fallbackQuery = fallbackQuery.eq('technology', filters.technology.trim());
        }
        if (filters.query && filters.query.trim().length > 0) {
          const q = filters.query.trim();
          fallbackQuery = fallbackQuery.or(
            `title.ilike.%${q}%,description.ilike.%${q}%,error_message.ilike.%${q}%,technology.ilike.%${q}%,language.ilike.%${q}%,framework.ilike.%${q}%`
          );
        }

        if (filters.sortBy === 'views') {
          fallbackQuery = fallbackQuery.order('views_count', { ascending: false });
        } else if (filters.sortBy === 'unanswered') {
          fallbackQuery = fallbackQuery.eq('answers_count', 0).order('created_at', { ascending: false });
        } else if (filters.sortBy === 'resolved') {
          fallbackQuery = fallbackQuery.eq('status', 'resolved').order('created_at', { ascending: false });
        } else {
          fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
        }

        const { data: rawQuestions, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;

        const authorIds = [...new Set((rawQuestions || []).map((q) => q.author_id).filter(Boolean))];
        const { data: profiles } = authorIds.length > 0
          ? await supabase
              .from('profiles')
              .select('id, display_name, username, avatar_url, country')
              .in('id', authorIds)
          : { data: [] };

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

        return (rawQuestions || []).map((q) => ({
          ...q,
          author: profileMap.get(q.author_id) || null,
        })) as Question[];
      }

      return (data || []) as Question[];
    } catch (err) {
      console.error('Erreur getQuestions:', err);
      throw err;
    }
  },

  /**
   * Récupère une question par son identifiant avec auteur et réponse acceptée.
   * Totalement résilient aux erreurs de jointure PostgREST et aux identifiants accepted_answer_id nuls.
   */
  async getQuestionById(id: string): Promise<Question | null> {
    if (!id) return null;

    // 1. Tenter la requête PostgREST avec jointures imbriquées
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          author:profiles!author_id (
            id,
            display_name,
            username,
            avatar_url,
            country
          ),
          accepted_answer:question_answers!accepted_answer_id (
            id,
            content,
            code_snippet,
            code_language,
            is_solution,
            created_at,
            author:profiles!author_id (
              id,
              display_name,
              username
            )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data as Question;
      }

      if (error) {
        console.warn('Requête getQuestionById avec jointures a échoué, bascule sur fallback direct:', error.message);
      }
    } catch (joinErr) {
      console.warn('Exception jointure getQuestionById:', joinErr);
    }

    // 2. Fallback direct ultra-fiable sans jointures imbriquées
    const { data: rawQuestion, error: rawError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (rawError) {
      console.error('Erreur getQuestionById direct:', rawError);
      throw new Error(rawError.message || 'Impossible de charger ce problème technique.');
    }

    if (!rawQuestion) {
      return null;
    }

    // Charger le profil de l'auteur
    let authorProfile = null;
    if (rawQuestion.author_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, country')
        .eq('id', rawQuestion.author_id)
        .maybeSingle();
      authorProfile = prof;
    }

    // Charger la réponse acceptée si présente
    let acceptedAnswer = null;
    if (rawQuestion.accepted_answer_id) {
      const { data: ans } = await supabase
        .from('question_answers')
        .select('*')
        .eq('id', rawQuestion.accepted_answer_id)
        .maybeSingle();

      if (ans) {
        let ansAuthor = null;
        if (ans.author_id) {
          const { data: aProf } = await supabase
            .from('profiles')
            .select('id, display_name, username')
            .eq('id', ans.author_id)
            .maybeSingle();
          ansAuthor = aProf;
        }
        acceptedAnswer = {
          ...ans,
          author: ansAuthor,
        };
      }
    }

    return {
      ...rawQuestion,
      author: authorProfile,
      accepted_answer: acceptedAnswer,
    } as Question;
  },

  /**
   * Récupère les questions d'un utilisateur.
   */
  async getUserQuestions(userId: string): Promise<Question[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur getUserQuestions:', error);
      throw error;
    }

    return (data || []) as Question[];
  },

  /**
   * Crée une nouvelle question
   */
  async createQuestion(formData: QuestionFormData, authorId: string): Promise<Question> {
    // S'assurer que le profil de l'auteur existe dans public.profiles avant l'insertion
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user && authData.user.id === authorId) {
      try {
        await profileService.ensureProfile(authData.user);
      } catch (profileErr) {
        console.warn('Vérification profil avant insertion question:', profileErr);
      }
    }

    const { data, error } = await supabase
      .from('questions')
      .insert({
        title: formData.title.trim(),
        description: formData.description.trim(),
        technology: formData.technology.trim(),
        language: formData.language?.trim() || null,
        framework: formData.framework?.trim() || null,
        error_message: formData.error_message?.trim() || null,
        expected_result: formData.expected_result?.trim() || null,
        tools_version: formData.tools_version?.trim() || null,
        environment: formData.environment?.trim() || null,
        code_snippet: formData.code_snippet?.trim() || null,
        code_language: formData.code_language || 'plaintext',
        attachments: formData.attachments || [],
        status: formData.status || 'open',
        author_id: authorId,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur createQuestion:', error);
      const detailedMessage = error.details
        ? `${error.message} (${error.details})`
        : error.message;
      throw new Error(detailedMessage || 'Erreur lors de la création de la question.');
    }

    return data as Question;
  },

  /**
   * Met à jour une question existante
   */
  async updateQuestion(id: string, formData: Partial<QuestionFormData>): Promise<Question> {
    const updatePayload: Record<string, any> = {};

    if (formData.title !== undefined) updatePayload.title = formData.title.trim();
    if (formData.description !== undefined) updatePayload.description = formData.description.trim();
    if (formData.technology !== undefined) updatePayload.technology = formData.technology.trim();
    if (formData.language !== undefined) updatePayload.language = formData.language?.trim() || null;
    if (formData.framework !== undefined) updatePayload.framework = formData.framework?.trim() || null;
    if (formData.error_message !== undefined) updatePayload.error_message = formData.error_message?.trim() || null;
    if (formData.expected_result !== undefined) updatePayload.expected_result = formData.expected_result?.trim() || null;
    if (formData.tools_version !== undefined) updatePayload.tools_version = formData.tools_version?.trim() || null;
    if (formData.environment !== undefined) updatePayload.environment = formData.environment?.trim() || null;
    if (formData.code_snippet !== undefined) updatePayload.code_snippet = formData.code_snippet?.trim() || null;
    if (formData.code_language !== undefined) updatePayload.code_language = formData.code_language;
    if (formData.attachments !== undefined) updatePayload.attachments = formData.attachments;
    if (formData.status !== undefined) updatePayload.status = formData.status;

    const { data, error } = await supabase
      .from('questions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur updateQuestion:', error);
      throw error;
    }

    return data as Question;
  },

  /**
   * Supprime une question (réservé à l'auteur ou admin)
   */
  async deleteQuestion(id: string): Promise<void> {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur deleteQuestion:', error);
      throw error;
    }
  },

  /**
   * Incrémente le nombre de consultations d'une question via la RPC Supabase
   */
  async incrementViews(id: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_question_views', {
        p_question_id: id,
      });

      if (error) {
        console.warn('Erreur RPC increment_question_views :', error.message);
        throw error;
      }
    } catch (err) {
      console.warn('Exception incrementViews :', err);
      throw err;
    }
  },

  /**
   * Téléverse une capture d'écran sur Supabase Storage
   */
  async uploadAttachment(file: File, userId: string): Promise<string> {
    const MAX_SIZE = 5 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      throw new Error("L'image dépasse la limite autorisée de 5 Mo.");
    }

    const ALLOWED_TYPES = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        'Format de fichier non supporté. Formats acceptés : PNG, JPEG, WebP, GIF.'
      );
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${Date.now()}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('entraide-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Erreur upload capture:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('entraide-attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * Récupère les réponses associées à une question (avec fallback résilient)
   */
  async getAnswers(questionId: string): Promise<QuestionAnswer[]> {
    try {
      const { data, error } = await supabase
        .from('question_answers')
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
        .eq('question_id', questionId)
        .order('is_solution', { ascending: false })
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as QuestionAnswer[];
      }

      if (error) {
        console.warn('Fallback getAnswers sans jointure imbriquée:', error.message);
      }
    } catch (joinErr) {
      console.warn('Exception getAnswers join:', joinErr);
    }

    // Fallback sans jointure imbriquée
    const { data: rawAnswers, error: rawError } = await supabase
      .from('question_answers')
      .select('*')
      .eq('question_id', questionId)
      .order('is_solution', { ascending: false })
      .order('created_at', { ascending: true });

    if (rawError || !rawAnswers) {
      console.error('Erreur getAnswers direct:', rawError);
      return [];
    }

    const authorIds = [...new Set(rawAnswers.map((a) => a.author_id).filter(Boolean))];
    const { data: profiles } = authorIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, country')
          .in('id', authorIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return rawAnswers.map((a) => ({
      ...a,
      author: profileMap.get(a.author_id) || null,
    })) as QuestionAnswer[];
  },

  /**
   * Ajoute une réponse à une question
   */
  async createAnswer(
    questionId: string,
    formData: AnswerFormData,
    authorId: string
  ): Promise<QuestionAnswer> {
    // S'assurer que le profil de l'auteur de la réponse existe
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user && authData.user.id === authorId) {
      try {
        await profileService.ensureProfile(authData.user);
      } catch (profileErr) {
        console.warn('Vérification profil avant insertion réponse:', profileErr);
      }
    }

    const { data, error } = await supabase
      .from('question_answers')
      .insert({
        question_id: questionId,
        author_id: authorId,
        content: formData.content.trim(),
        code_snippet: formData.code_snippet?.trim() || null,
        code_language: formData.code_language || 'plaintext',
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur createAnswer:', error);
      const detailedMessage = error.details
        ? `${error.message} (${error.details})`
        : error.message;
      throw new Error(detailedMessage || "Erreur lors de l'enregistrement de votre réponse.");
    }

    // Récupérer le profil auteur
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, country')
      .eq('id', authorId)
      .maybeSingle();

    return {
      ...data,
      author: authorProfile || null,
    } as QuestionAnswer;
  },

  /**
   * Supprime une réponse
   */
  async deleteAnswer(answerId: string): Promise<void> {
    const { error } = await supabase
      .from('question_answers')
      .delete()
      .eq('id', answerId);

    if (error) {
      console.error('Erreur deleteAnswer:', error);
      throw error;
    }
  },

  /**
   * Marque ou retire une réponse comme solution validée.
   * Utilise la RPC mark_question_solution en priorité avec repli direct en cas de besoin.
   */
  async markAnswerAsSolution(
    questionId: string,
    answerId: string,
    isSolution: boolean
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_question_solution', {
        p_question_id: questionId,
        p_answer_id: answerId,
        p_is_solution: isSolution,
      });

      if (!error) return;

      console.warn('RPC mark_question_solution a échoué, tentative directe:', error.message);
    } catch (rpcErr) {
      console.warn('Exception RPC mark_question_solution:', rpcErr);
    }

    // Fallback direct si la RPC est indisponible
    if (isSolution) {
      await supabase
        .from('question_answers')
        .update({ is_solution: false })
        .eq('question_id', questionId);

      const { error: ansError } = await supabase
        .from('question_answers')
        .update({ is_solution: true })
        .eq('id', answerId);

      if (ansError) throw ansError;

      const { error: qError } = await supabase
        .from('questions')
        .update({
          status: 'resolved',
          accepted_answer_id: answerId,
        })
        .eq('id', questionId);

      if (qError) throw qError;
    } else {
      await supabase
        .from('question_answers')
        .update({ is_solution: false })
        .eq('id', answerId);

      const { error: qError } = await supabase
        .from('questions')
        .update({
          status: 'in_progress',
          accepted_answer_id: null,
        })
        .eq('id', questionId);

      if (qError) throw qError;
    }
  },

  /**
   * Signale une question ou une réponse
   */
  async reportQuestionOrAnswer(data: {
    questionId?: string;
    answerId?: string;
    reason: string;
    description: string;
    userId: string;
  }): Promise<void> {
    const { error } = await supabase.from('question_reports').insert({
      question_id: data.questionId || null,
      answer_id: data.answerId || null,
      user_id: data.userId,
      reason: data.reason,
      description: data.description.trim(),
      status: 'open',
    });

    if (error) {
      console.error('Erreur reportQuestionOrAnswer:', error);
      throw error;
    }
  },

  /**
   * Récupère les signalements de questions pour la modération
   */
  async getQuestionReports(): Promise<QuestionReport[]> {
    const { data, error } = await supabase
      .from('question_reports')
      .select(`
        *,
        reporter:profiles!user_id (
          id,
          display_name,
          username
        ),
        question:questions!question_id (
          id,
          title,
          status,
          author_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur getQuestionReports:', error);
      return [];
    }

    return (data || []) as QuestionReport[];
  },

  /**
   * Met à jour le statut d'un signalement
   */
  async updateQuestionReportStatus(
    reportId: string,
    status: 'resolved' | 'rejected',
    moderationNotes?: string,
    adminId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('question_reports')
      .update({
        status,
        moderation_notes: moderationNotes || null,
        reviewed_by: adminId || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      console.error('Erreur updateQuestionReportStatus:', error);
      throw error;
    }
  },

  /**
   * Masque ou réaffiche une question
   */
  async toggleQuestionVisibility(questionId: string, hide: boolean): Promise<void> {
    const { error } = await supabase
      .from('questions')
      .update({ status: hide ? 'hidden' : 'open' })
      .eq('id', questionId);

    if (error) {
      console.error('Erreur toggleQuestionVisibility:', error);
      throw error;
    }
  },
};
