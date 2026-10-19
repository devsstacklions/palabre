import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportService } from '../services/report.service';
import { ficheService } from '../services/fiche.service';
import { useAuth } from '../contexts/AuthContext';
import { FicheReport, Fiche } from '../types';
import { formatRelativeDate } from '../lib/utils';
import { ShieldCheck, AlertTriangle, EyeOff, Check, ExternalLink } from 'lucide-react';

export const AdminModerationPage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<FicheReport[]>([]);
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadModerationData = async () => {
    setIsLoading(true);
    try {
      const [reps, allFiches] = await Promise.all([
        reportService.getReports(),
        ficheService.getFiches(),
      ]);
      setReports(reps);
      setFiches(allFiches);
    } catch (err) {
      console.error('Erreur chargement données modération:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModerationData();
  }, []);

  const handleRejectReport = async (reportId: string) => {
    if (!window.confirm('Confirmer le rejet de ce signalement ?')) return;
    try {
      await reportService.updateReportStatus(reportId, 'rejected', 'Signalement jugé non fondé', user?.id);
      setActionSuccess('Signalement rejeté.');
      setTimeout(() => setActionSuccess(''), 2500);
      await loadModerationData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du traitement');
    }
  };

  const handleHideFiche = async (reportId: string, ficheId: string) => {
    if (!window.confirm('Voulez-vous vraiment masquer cette fiche de la plateforme publique ?')) return;
    try {
      await ficheService.toggleFicheVisibility(ficheId, true);
      await reportService.updateReportStatus(
        reportId,
        'resolved',
        'Fiche masquée suite au signalement',
        user?.id
      );
      setActionSuccess('Fiche masquée et signalement résolu.');
      setTimeout(() => setActionSuccess(''), 2500);
      await loadModerationData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du masquage de la fiche');
    }
  };

  const openReports = reports.filter((r) => r.status === 'open');
  const toVerifyCount = fiches.filter((f) => f.verification_status === 're').length;
  const hiddenCount = fiches.filter((f) => f.status === 'hidden').length;

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 mb-1 text-amber-700">
          <ShieldCheck size={22} />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-palabre-text tracking-tight">
            Espace Modération & Administration
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-palabre-muted">
          Examen des signalements communautaires, contrôle de conformité et traçabilité des décisions.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-btn text-xs font-semibold flex items-center gap-2">
          <Check size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Cartes d'indicateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-palabre-border rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-palabre-muted uppercase tracking-wider">
              Signalements en attente
            </span>
            <AlertTriangle size={18} className="text-palabre-fl" />
          </div>
          <p className="text-3xl font-black text-palabre-text mt-2">{openReports.length}</p>
        </div>

        <div className="bg-white border border-palabre-border rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-palabre-muted uppercase tracking-wider">
              Fiches à revérifier
            </span>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Priorité
            </span>
          </div>
          <p className="text-3xl font-black text-palabre-text mt-2">{toVerifyCount}</p>
        </div>

        <div className="bg-white border border-palabre-border rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-palabre-muted uppercase tracking-wider">
              Fiches masquées
            </span>
            <EyeOff size={18} className="text-slate-500" />
          </div>
          <p className="text-3xl font-black text-palabre-text mt-2">{hiddenCount}</p>
        </div>
      </div>

      {/* Tableau des signalements */}
      <div className="bg-white border border-palabre-border rounded-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-palabre-border">
          <h2 className="text-base font-bold text-palabre-text">Signalements récents</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-palabre-muted">Chargement des signalements...</div>
        ) : reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-palabre-border text-slate-700">
                  <th className="p-3 font-semibold">Fiche concernée</th>
                  <th className="p-3 font-semibold">Motif</th>
                  <th className="p-3 font-semibold">Signalé par</th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Statut</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-medium text-slate-900 max-w-[200px] truncate">
                      <Link
                        to={`/fiches/${r.fiche_id}`}
                        target="_blank"
                        className="text-palabre-primary hover:underline flex items-center gap-1"
                        title={r.fiche?.title || 'Voir la fiche'}
                      >
                        <span className="truncate">{r.fiche?.title || r.fiche_id}</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </Link>
                      <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                        « {r.description} »
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 text-[11px] font-medium">
                        {r.reason}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {r.reporter?.display_name || 'Utilisateur'}
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {formatRelativeDate(r.created_at)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          r.status === 'open'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : r.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status === 'open' ? 'En attente' : r.status === 'resolved' ? 'Traité' : 'Rejeté'}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {r.status === 'open' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRejectReport(r.id)}
                            className="px-2.5 py-1 bg-white border border-palabre-border hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                          >
                            Rejeter
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHideFiche(r.id, r.fiche_id)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer shadow-xs"
                          >
                            Masquer la fiche
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Traité</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-palabre-muted">
            Aucun signalement enregistré dans la base de données.
          </div>
        )}
      </div>
    </div>
  );
};
