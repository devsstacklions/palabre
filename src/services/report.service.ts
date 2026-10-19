import { supabase } from '../lib/supabase';
import { FicheReport, ReportStatus } from '../types';
import { ReportFormData } from '../schemas/interaction.schema';

export const reportService = {
  async createReport(
    ficheId: string,
    userId: string,
    data: ReportFormData
  ): Promise<FicheReport> {
    const { data: report, error } = await supabase
      .from('fiche_reports')
      .insert({
        fiche_id: ficheId,
        user_id: userId,
        reason: data.reason,
        description: data.description.trim(),
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur createReport:', error);
      throw error;
    }
    return report as FicheReport;
  },

  async getReports(statusFilter?: ReportStatus): Promise<FicheReport[]> {
    let query = supabase
      .from('fiche_reports')
      .select(`
        *,
        fiche:fiches (
          id,
          title,
          status,
          author_id
        ),
        reporter:profiles!user_id (
          id,
          display_name,
          username
        )
      `)
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erreur getReports:', error);
      throw error;
    }
    return (data || []) as FicheReport[];
  },

  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    notes?: string,
    reviewerId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('fiche_reports')
      .update({
        status,
        moderation_notes: notes || null,
        reviewed_by: reviewerId || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      console.error('Erreur updateReportStatus:', error);
      throw error;
    }
  },
};

