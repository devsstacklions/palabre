import { supabase } from '../lib/supabase';
import { FicheReport, Profile } from '../types';

export interface DailyActivity {
  day: string;
  signups: number;
  fiches: number;
  confirmations: number;
  variants: number;
  reports: number;
}

export interface AdminOverview {
  userCount: number;
  publishedFicheCount: number;
  openReportCount: number;
  activeContributorCount: number;
  dailyActivity: DailyActivity[];
  recentProfiles: Pick<Profile, 'id' | 'display_name' | 'username' | 'created_at'>[];
  recentReports: FicheReport[];
}

type ActivityEventRow = { created_at: string; actor_id?: string | null };
type ActivityPageReader = (from: number, to: number) => Promise<{
  data: ActivityEventRow[] | null;
  error: { message: string } | null;
}>;

async function readRecentActivity(reader: ActivityPageReader): Promise<ActivityEventRow[]> {
  const rows: ActivityEventRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await reader(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
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
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() - 13);
    const start = startDate.toISOString();
    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end = endDate.toISOString();

    const [profiles, publishedFiches, openReports, recentProfiles, recentReports,
      signups, ficheEvents, confirmationEvents, variantEvents, reportEvents] =
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
        readRecentActivity(async (from, to) => await supabase.from('profiles')
          .select('created_at, actor_id:id').gte('created_at', start).lt('created_at', end)
          .order('created_at').range(from, to)),
        readRecentActivity(async (from, to) => await supabase.from('fiches')
          .select('created_at, actor_id:author_id').eq('status', 'published')
          .gte('created_at', start).lt('created_at', end).order('created_at').range(from, to)),
        readRecentActivity(async (from, to) => await supabase.from('fiche_confirmations')
          .select('created_at, actor_id:user_id').gte('created_at', start).lt('created_at', end)
          .order('created_at').range(from, to)),
        readRecentActivity(async (from, to) => await supabase.from('fiche_variants')
          .select('created_at, actor_id:author_id').gte('created_at', start).lt('created_at', end)
          .order('created_at').range(from, to)),
        readRecentActivity(async (from, to) => await supabase.from('fiche_reports')
          .select('created_at, actor_id:user_id').gte('created_at', start).lt('created_at', end)
          .order('created_at').range(from, to)),
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
      activeContributorCount: new Set([
        ...ficheEvents.map(({ actor_id }) => actor_id),
        ...confirmationEvents.map(({ actor_id }) => actor_id),
        ...variantEvents.map(({ actor_id }) => actor_id),
        ...reportEvents.map(({ actor_id }) => actor_id),
      ].filter((actorId): actorId is string => Boolean(actorId))).size,
      dailyActivity: Array.from({ length: 14 }, (_, index) => {
        const day = new Date(startDate);
        day.setUTCDate(day.getUTCDate() + index);
        const key = day.toISOString().slice(0, 10);
        const countOnDay = (events: ActivityEventRow[]) => events.filter((event) => event.created_at.slice(0, 10) === key).length;
        return {
          day: key,
          signups: countOnDay(signups),
          fiches: countOnDay(ficheEvents),
          confirmations: countOnDay(confirmationEvents),
          variants: countOnDay(variantEvents),
          reports: countOnDay(reportEvents),
        };
      }),
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
