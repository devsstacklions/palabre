import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertCircle, ArrowRight, BookOpenCheck, RefreshCw, ShieldAlert, Users } from 'lucide-react';
import { adminService, AdminOverview } from '../services/admin.service';
import { formatRelativeDate } from '../lib/utils';
import { ActivityChart } from '../components/admin/ActivityChart';

const metricCards = [
  { key: 'userCount', label: 'Comptes', icon: Users, color: 'text-sky-700 bg-sky-50' },
  {
    key: 'publishedFicheCount',
    label: 'Fiches publiées',
    icon: BookOpenCheck,
    color: 'text-emerald-700 bg-emerald-50',
  },
  {
    key: 'openReportCount',
    label: 'Signalements ouverts',
    icon: ShieldAlert,
    color: 'text-amber-700 bg-amber-50',
  },
  {
    key: 'activeContributorCount',
    label: 'Contributeurs actifs · 14 j',
    icon: Activity,
    color: 'text-violet-700 bg-violet-50',
  },
] as const;

export const AdminDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setOverview(await adminService.getOverview());
    } catch (cause) {
      console.error('Erreur de chargement du tableau de bord admin:', cause);
      setError('Les données du tableau de bord ne sont pas disponibles. Réessayez dans un instant.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-palabre-primary">Vue d’ensemble</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Bonjour, équipe Palabre</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Consultez l’activité réelle de la plateforme et traitez les signalements en attente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
          Actualiser
        </button>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="flex items-center gap-2">
            <AlertCircle size={17} aria-hidden="true" />
            {error}
          </span>
          <button type="button" onClick={() => void loadOverview()} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      <section aria-label="Indicateurs de la plateforme" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ key, label, icon: Icon, color }) => (
          <article key={key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">{label}</span>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon size={19} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">
              {isLoading ? <span className="inline-block h-9 w-16 animate-pulse rounded bg-slate-100" /> : overview?.[key] ?? '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Données synchronisées avec Supabase</p>
          </article>
        ))}
      </section>

      {overview && <ActivityChart data={overview.dailyActivity} />}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="font-semibold">Inscriptions récentes</h3>
              <p className="mt-1 text-xs text-slate-500">Nouveaux profils enregistrés</p>
            </div>
            <Users size={18} className="text-slate-400" aria-hidden="true" />
          </div>
          {isLoading ? (
            <p className="p-5 text-sm text-slate-500">Chargement des profils…</p>
          ) : overview?.recentProfiles.length ? (
            <ul className="divide-y divide-slate-100">
              {overview.recentProfiles.map((profile) => (
                <li key={profile.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{profile.display_name}</p>
                    <p className="truncate text-xs text-slate-500">@{profile.username}</p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-500" dateTime={profile.created_at}>
                    {formatRelativeDate(profile.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-slate-500">Aucun profil enregistré.</p>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="font-semibold">Signalements à traiter</h3>
              <p className="mt-1 text-xs text-slate-500">Les signalements les plus récents</p>
            </div>
            <Link to="/admin/moderation" className="inline-flex items-center gap-1 text-xs font-semibold text-palabre-primary hover:underline">
              Ouvrir la modération <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {isLoading ? (
            <p className="p-5 text-sm text-slate-500">Chargement des signalements…</p>
          ) : overview?.recentReports.length ? (
            <ul className="divide-y divide-slate-100">
              {overview.recentReports.map((report) => (
                <li key={report.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{report.fiche?.title || 'Fiche supprimée'}</p>
                    <p className="truncate text-xs text-slate-500">{report.reason}</p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-500" dateTime={report.created_at}>
                    {formatRelativeDate(report.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-slate-500">Aucun signalement en attente.</p>
          )}
        </section>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Le graphique compte les inscriptions, fiches publiées, confirmations, variantes et signalements enregistrés. Les vues de pages et les connexions ne sont pas suivies par la base actuelle.
      </p>
    </div>
  );
};
