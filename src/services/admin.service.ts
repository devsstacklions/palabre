import { supabase } from '../lib/supabase';
import { FicheReport, Profile } from '../types';

export interface AdminOverview {
  userCount: number;
  publishedFicheCount: number;
  openReportCount: number;
  recentProfiles: Pick<Profile, 'id' | 'display_name' | 'username' | 'created_at'>[];
  recentReports: FicheReport[];
}

export interface ModerationFicheStats {
  needsReview: number;
  hidden: number;
}

export interface AdminUserPage {
  users: Pick<Profile, 'id' | 'display_name' | 'username' | 'country' | 'created_at'>[];
  total: number;
}

export const adminService = {
  async getUsers(search: string, page: number, pageSize: number): Promise<AdminUserPage> {
    let query = supabase
      .from('profiles')
      .select('id, display_name, username, country, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const normalizedSearch = search.trim().replace(/[%_\\]/g, '\\$&');
    if (normalizedSearch) {
      query = query.ilike('username', `%${normalizedSearch}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return { users: data ?? [], total: count ?? 0 };
  },

  async getOverview(): Promise<AdminOverview> {
    const [profiles, publishedFiches, openReports, recentProfiles, recentReports] =
      await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('fiches')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published'),
        supabase
          .from('fiche_reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open'),
        supabase
          .from('profiles')
          .select('id, display_name, username, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('fiche_reports')
          .select(`
            id,
            fiche_id,
            user_id,
            reason,
            description,
            status,
            created_at,
            fiche:fiches (id, title, status, author_id)
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

    const queryError =
      profiles.error ??
      publishedFiches.error ??
      openReports.error ??
      recentProfiles.error ??
      recentReports.error;
    if (queryError) throw queryError;

    return {
      userCount: profiles.count ?? 0,
      publishedFicheCount: publishedFiches.count ?? 0,
      openReportCount: openReports.count ?? 0,
      recentProfiles: recentProfiles.data ?? [],
      recentReports: (recentReports.data ?? []).map((report): FicheReport => ({
        ...report,
        fiche: Array.isArray(report.fiche) ? report.fiche[0] ?? null : report.fiche,
      })) as FicheReport[],
    };
  },

  async getModerationFicheStats(): Promise<ModerationFicheStats> {
    const [needsReview, hidden] = await Promise.all([
      supabase
        .from('fiches')
        .select('id', { count: 'exact', head: true })
        .eq('verification_status', 're'),
      supabase
        .from('fiches')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'hidden'),
    ]);

    if (needsReview.error) throw needsReview.error;
    if (hidden.error) throw hidden.error;

    return {
      needsReview: needsReview.count ?? 0,
      hidden: hidden.count ?? 0,
    };
  },
};
