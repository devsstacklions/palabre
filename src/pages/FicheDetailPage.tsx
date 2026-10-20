import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ficheService } from '../services/fiche.service';
import { confirmationService } from '../services/confirmation.service';
import { variantService } from '../services/variant.service';
import { reportService } from '../services/report.service';
import { favoriteService } from '../services/favorite.service';
import { useAuth } from '../contexts/AuthContext';
import { Fiche, FicheConfirmation, FicheVariant } from '../types';
import { Badge } from '../components/ui/Badge';
import { CodeBlock } from '../components/fiches/CodeBlock';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { ReportModal } from '../components/modals/ReportModal';
import { VariantModal } from '../components/modals/VariantModal';
import { formatRelativeDate, formatFullDate, copyToClipboard } from '../lib/utils';
import { ConfirmationFormData, ReportFormData, VariantFormData } from '../schemas/interaction.schema';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  GitFork,
  Bookmark,
  Share2,
  ShieldAlert,
  Clock,
  User,
  Check,
} from 'lucide-react';

export const FicheDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [confirmations, setConfirmations] = useState<FicheConfirmation[]>([]);
  const [variants, setVariants] = useState<FicheVariant[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  const loadFicheData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [fetchedFiche, fetchedConfirmations, fetchedVariants] = await Promise.all([
        ficheService.getFicheById(id),
        confirmationService.getConfirmations(id),
        variantService.getVariants(id),
      ]);

      setFiche(fetchedFiche);
      setConfirmations(fetchedConfirmations);
      setVariants(fetchedVariants);

      if (user) {
        const fav = await favoriteService.isFavorite(id, user.id);
        setIsFavorite(fav);
      }
    } catch (err) {
      console.error('Erreur chargement détail fiche:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadFicheData();
  }, [loadFicheData]);

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!fiche) return;
    try {
      if (isFavorite) {
        await favoriteService.removeFavorite(fiche.id, user.id);
        setIsFavorite(false);
      } else {
        await favoriteService.addFavorite(fiche.id, user.id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Erreur favoris:', err);
    }
  };

  const handleShare = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    }
  };

  const handleAddConfirmation = async (data: ConfirmationFormData) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!fiche) return;
    await confirmationService.addConfirmation(fiche.id, user.id, data);
    await loadFicheData();
  };

  const handleAddReport = async (data: ReportFormData) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!fiche) return;
    await reportService.createReport(fiche.id, user.id, data);
    alert('Signalement bien enregistré. Les modérateurs et l’auteur en ont été notifiés.');
  };

  const handleAddVariant = async (data: VariantFormData) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!fiche) return;
    await variantService.addVariant(fiche.id, user.id, data);
    await loadFicheData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-3 border-palabre-border border-t-palabre-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="bg-white border border-palabre-border rounded-card p-10 text-center max-w-md mx-auto my-12">
        <h2 className="text-xl font-bold text-palabre-text mb-2">Fiche introuvable</h2>
        <p className="text-xs sm:text-sm text-palabre-muted mb-6">
          Cette fiche technique n'existe pas ou a été archivée par son auteur.
        </p>
        <Link
          to="/search"
          className="px-4 py-2 bg-palabre-primary text-white rounded-btn text-xs font-semibold"
        >
          Retour aux solutions
        </Link>
      </div>
    );
  }

  const authorName = fiche.author?.display_name || 'Contributeur';

  return (
    <div className="space-y-6 pb-16">
      {/* Retour aux résultats */}
      <div>
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-palabre-primary hover:underline"
        >
          <ArrowLeft size={14} />
          <span>Retour aux résultats</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Principale */}
        <article className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge status={fiche.verification_status} />
              {fiche.category && (
                <span className="text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-slate-700 font-medium">
                  {fiche.category.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-palabre-text tracking-tight mb-2">
              {fiche.title}
            </h1>

            <p className="text-xs text-palabre-muted flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <User size={13} className="text-palabre-muted" />
                {authorName}
              </span>
              <span>·</span>
              <span>Dernière vérification : {formatRelativeDate(fiche.last_validated_at || fiche.created_at)}</span>
            </p>
          </div>

          {/* Bannières contextuelles de statut */}
          {fiche.verification_status === 're' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-card text-xs text-amber-900 flex items-start gap-3">
              <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">À revérifier</strong>
                Dernière confirmation enregistrée il y a plus de 90 jours. Cela ne signifie pas que la solution est erronée : testez-la dans votre contexte et aidez la communauté en indiquant le résultat.
              </div>
            </div>
          )}

          {fiche.verification_status === 'fl' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-card text-xs text-red-900 flex items-start gap-3">
              <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Fiche signalée par la communauté</strong>
                Un ou plusieurs contributeurs ont observé un comportement différent ou un échec dans certaines conditions. Consultez les signalements et précisions ci-dessous avant d'appliquer.
              </div>
            </div>
          )}

          {/* 1. Problème et contexte */}
          <section className="bg-white border border-palabre-border rounded-card p-5 space-y-3">
            <h2 className="text-base font-bold text-palabre-text">Problème rencontré</h2>
            <p className="text-sm text-palabre-text leading-relaxed whitespace-pre-line">
              {fiche.problem}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-xs bg-palabre-bg border border-palabre-border px-2.5 py-0.5 rounded-full font-medium">
                {fiche.country}
              </span>
              <span className="text-xs bg-palabre-bg border border-palabre-border px-2.5 py-0.5 rounded-full font-medium">
                {fiche.operator_service}
              </span>
              <span className="text-xs bg-palabre-bg border border-palabre-border px-2.5 py-0.5 rounded-full font-medium">
                {fiche.language}
              </span>
              {fiche.api_version && (
                <span className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono text-slate-700">
                  {fiche.api_version}
                </span>
              )}
            </div>
          </section>

          {/* Prérequis */}
          {fiche.prerequisites && (
            <section className="bg-white border border-palabre-border rounded-card p-5">
              <h2 className="text-base font-bold text-palabre-text mb-2">Prérequis</h2>
              <p className="text-sm text-palabre-text leading-relaxed">
                {fiche.prerequisites}
              </p>
            </section>
          )}

          {/* 2. Étapes de résolution */}
          <section className="bg-white border border-palabre-border rounded-card p-5">
            <h2 className="text-base font-bold text-palabre-text mb-3">Étapes de résolution</h2>
            <ol className="space-y-2 list-decimal list-inside text-sm text-palabre-text leading-relaxed">
              {fiche.steps.map((step, idx) => (
                <li key={idx} className="pl-1">
                  <span className="font-normal">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Extrait de code */}
          {fiche.code_snippet && (
            <section className="bg-white border border-palabre-border rounded-card p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-bold text-palabre-text">Extrait de code testé</h2>
                <span className="text-xs text-palabre-muted">Exemple prêt à l'emploi</span>
              </div>
              <CodeBlock code={fiche.code_snippet} language={fiche.language} />
            </section>
          )}

          {/* Erreurs fréquentes et Limites */}
          {(fiche.frequent_errors || fiche.known_limits) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fiche.frequent_errors && (
                <div className="bg-white border border-palabre-border rounded-card p-5">
                  <h3 className="text-sm font-bold text-palabre-text mb-2 flex items-center gap-1.5 text-amber-700">
                    <AlertTriangle size={15} />
                    <span>Erreurs fréquentes</span>
                  </h3>
                  <p className="text-xs text-palabre-text leading-relaxed">
                    {fiche.frequent_errors}
                  </p>
                </div>
              )}

              {fiche.known_limits && (
                <div className="bg-white border border-palabre-border rounded-card p-5">
                  <h3 className="text-sm font-bold text-palabre-text mb-2 text-slate-800">
                    Limites et restrictions connues
                  </h3>
                  <p className="text-xs text-palabre-text leading-relaxed">
                    {fiche.known_limits}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Variantes contextuelles */}
          <section className="bg-white border border-palabre-border rounded-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitFork size={18} className="text-palabre-primary" />
                <h2 className="text-base font-bold text-palabre-text">Variantes contextuelles</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  setIsVariantModalOpen(true);
                }}
                className="text-xs font-semibold text-palabre-primary hover:underline flex items-center gap-1"
              >
                + Proposer une variante
              </button>
            </div>

            {variants.length > 0 ? (
              <div className="space-y-3">
                {variants.map((v) => (
                  <div key={v.id} className="p-3 bg-palabre-bg border border-palabre-border rounded-btn text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="font-semibold text-palabre-text text-sm">{v.title}</strong>
                      <span className="text-palabre-muted">Par {v.author?.display_name || 'Dev'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="bg-white border border-palabre-border px-2 py-0.5 rounded text-xs">
                        {v.country}
                      </span>
                      <span className="bg-white border border-palabre-border px-2 py-0.5 rounded text-xs">
                        {v.operator_service}
                      </span>
                    </div>
                    <p className="text-palabre-text leading-relaxed whitespace-pre-line">
                      {v.differences}
                    </p>
                    {v.code_snippet && (
                      <CodeBlock code={v.code_snippet} language={fiche.language} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-palabre-muted">
                Aucune variante spécifique publiée pour un autre pays ou opérateur. Si vous avez adapté cette solution pour un autre contexte, partagez-la ici.
              </p>
            )}
          </section>

          {/* Confirmations de la communauté */}
          <section className="bg-white border border-palabre-border rounded-card p-5 space-y-4">
            <h2 className="text-base font-bold text-palabre-text">
              Historique des confirmations ({confirmations.length})
            </h2>

            {confirmations.length > 0 ? (
              <div className="space-y-2.5">
                {confirmations.map((c) => (
                  <div key={c.id} className="p-3 border border-slate-100 rounded-btn bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-palabre-text flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-palabre-ok" />
                        {c.user?.display_name || 'Développeur vérifié'}
                      </span>
                      <span className="text-palabre-muted">{formatFullDate(c.created_at)}</span>
                    </div>
                    <div className="text-palabre-muted">
                      Contexte : <span className="font-medium text-slate-700">{c.country} ({c.operator_service})</span>
                      {c.tested_version && <span> · Version : {c.tested_version}</span>}
                    </div>
                    {c.comment && (
                      <p className="text-palabre-text italic pt-1">« {c.comment} »</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-palabre-muted">
                Soyez le premier développeur à confirmer le bon fonctionnement de cette fiche technique dans votre environnement.
              </p>
            )}
          </section>
        </article>

        {/* Sidebar Communauté */}
        <aside className="space-y-4">
          <div className="bg-white border border-palabre-border rounded-card p-5 sticky top-20 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-base text-palabre-text mb-1">Communauté</h3>
              <p className="text-xs text-palabre-muted">
                <span className="font-bold text-palabre-text text-sm">{fiche.confirmations_count}</span> confirmation{fiche.confirmations_count > 1 ? 's' : ''} enregistrée{fiche.confirmations_count > 1 ? 's' : ''} pour le contexte : <strong className="text-slate-700">{fiche.country}</strong>.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  setIsConfirmModalOpen(true);
                }}
                className="w-full py-2.5 px-4 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <CheckCircle2 size={16} />
                <span>Ça marche chez moi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  setIsReportModalOpen(true);
                }}
                className="w-full py-2 px-3 border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertTriangle size={15} className="text-palabre-fl" />
                <span>Signaler un problème</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  setIsVariantModalOpen(true);
                }}
                className="w-full py-2 px-3 border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <GitFork size={15} />
                <span>Proposer une variante</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFavorite}
                className={`w-full py-2 px-3 border rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  isFavorite
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-palabre-border hover:bg-slate-50 text-palabre-text'
                }`}
              >
                <Bookmark size={15} fill={isFavorite ? 'currentColor' : 'none'} />
                <span>{isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="w-full py-2 px-3 border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {shareFeedback ? (
                  <>
                    <Check size={15} className="text-emerald-600" />
                    <span className="text-emerald-700">Lien copié dans le presse-papier !</span>
                  </>
                ) : (
                  <>
                    <Share2 size={15} />
                    <span>Partager cette solution</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-palabre-muted space-y-1">
              <div>Règles de contribution :</div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>Ne jamais poster de clés d'API ni secrets</li>
                <li>Préciser toujours l'environnement de test</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onSubmit={handleAddConfirmation}
        defaultCountry={fiche.country}
        defaultOperator={fiche.operator_service}
        ficheTitle={fiche.title}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleAddReport}
        ficheTitle={fiche.title}
      />

      <VariantModal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        onSubmit={handleAddVariant}
        ficheTitle={fiche.title}
      />
    </div>
  );
};

