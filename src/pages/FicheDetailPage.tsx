
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ficheService } from '../services/fiche.service';
import { confirmationService } from '../services/confirmation.service';
import { variantService } from '../services/variant.service';
import { reportService } from '../services/report.service';
import { favoriteService } from '../services/favorite.service';
import { commentService } from '../services/comment.service';
import { useAuth } from '../contexts/AuthContext';
import { Fiche, FicheConfirmation, FicheVariant, FicheComment } from '../types';
import { Badge } from '../components/ui/Badge';
import { CodeBlock as FicheCodeBlock } from '../components/fiches/CodeBlock';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { ReportModal } from '../components/modals/ReportModal';
import { VariantModal } from '../components/modals/VariantModal';
import { formatRelativeDate, formatFullDate, copyToClipboard } from '../lib/utils';
import {
  ConfirmationFormData,
  ReportFormData,
  VariantFormData,
} from '../schemas/interaction.schema';
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
  Eye,
  MessageSquare,
  Edit,
  Trash2,
  Send,
} from 'lucide-react';

export const FicheDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isModerator, isAdmin, isLoading: isAuthLoading } = useAuth();

  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [confirmations, setConfirmations] = useState<FicheConfirmation[]>([]);
  const [userConfirmation, setUserConfirmation] =
    useState<FicheConfirmation | null>(null);
  const [variants, setVariants] = useState<FicheVariant[]>([]);
  const [comments, setComments] = useState<FicheComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Évite les appels en double pendant le même montage.
  const countedFicheId = useRef<string | null>(null);
  const countingFicheId = useRef<string | null>(null);

  // Modals state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  const loadFicheData = useCallback(async () => {
    if (!id) {
      setFiche(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Charger en priorité la fiche principale
      const fetchedFiche = await ficheService.getFicheById(id);

      if (!fetchedFiche) {
        setFiche(null);
        setConfirmations([]);
        setVariants([]);
        setComments([]);
        setIsFavorite(false);
        setUserConfirmation(null);
        setIsLoading(false);
        return;
      }

      // La fiche existe : on l'enregistre immédiatement dans l'état
      setFiche(fetchedFiche);

      // 2. Charger les collections secondaires de manière résiliente et découplée
      const [confirmationsRes, variantsRes, commentsRes] = await Promise.allSettled([
        confirmationService.getConfirmations(id),
        variantService.getVariants(id),
        commentService.getComments(id),
      ]);

      if (confirmationsRes.status === 'fulfilled') {
        setConfirmations(confirmationsRes.value);
      } else {
        console.warn('Erreur chargement confirmations :', confirmationsRes.reason);
        setConfirmations([]);
      }

      if (variantsRes.status === 'fulfilled') {
        setVariants(variantsRes.value);
      } else {
        console.warn('Erreur chargement variantes :', variantsRes.reason);
        setVariants([]);
      }

      if (commentsRes.status === 'fulfilled') {
        setComments(commentsRes.value);
      } else {
        console.warn('Erreur chargement commentaires :', commentsRes.reason);
        setComments([]);
      }

      // 3. Charger l'état utilisateur (favori et confirmation personnelle)
      if (user) {
        const [favRes, userConfRes] = await Promise.allSettled([
          favoriteService.isFavorite(id, user.id),
          confirmationService.getUserConfirmation(id, user.id),
        ]);

        setIsFavorite(favRes.status === 'fulfilled' ? favRes.value : false);
        setUserConfirmation(userConfRes.status === 'fulfilled' ? userConfRes.value : null);
      } else {
        setIsFavorite(false);
        setUserConfirmation(null);
      }
    } catch (err) {
      console.error('Erreur chargement détail fiche :', err);
      setFiche(null);
      setConfirmations([]);
      setVariants([]);
      setComments([]);
      setIsFavorite(false);
      setUserConfirmation(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  // 1. Charger les données avant de compter la consultation.
  useEffect(() => {
    void loadFicheData();
  }, [loadFicheData]);

  // 2. Compter uniquement si la fiche existe et correspond à l'URL.
  useEffect(() => {
    if (!id || !fiche || fiche.id !== id) {
      return;
    }

    if (
      countedFicheId.current === id ||
      countingFicheId.current === id
    ) {
      return;
    }

    countingFicheId.current = id;

    void ficheService
      .incrementView(id)
      .then(() => {
        countedFicheId.current = id;
      })
      .catch((err) => {
        console.error(
          'Erreur incrémentation des consultations :',
          err
        );
      })
      .finally(() => {
        if (countingFicheId.current === id) {
          countingFicheId.current = null;
        }
      });
  }, [id, fiche]);

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
      console.error('Erreur favoris :', err);
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

    if (user.id === fiche.author_id) {
      alert("Un auteur ne peut pas confirmer sa propre fiche technique.");
      return;
    }

    await confirmationService.addConfirmation(fiche.id, user.id, data);
    await loadFicheData();
  };

  const handleDeleteConfirmation = async () => {
    if (!user || !fiche) return;

    await confirmationService.removeUserConfirmation(fiche.id, user.id);
    setUserConfirmation(null);
    await loadFicheData();
  };

  const handleAddReport = async (data: ReportFormData) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!fiche) return;

    await reportService.createReport(fiche.id, user.id, data);

    alert(
      "Signalement bien enregistré. Les modérateurs et l’auteur en ont été notifiés."
    );
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

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate('/login');
      return;
    }

    if (!fiche || !newCommentText.trim()) return;

    setIsSubmittingComment(true);

    try {
      const added = await commentService.addComment(
        fiche.id,
        user.id,
        newCommentText
      );

      setComments((prev) => [...prev, added]);
      setNewCommentText('');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la publication du commentaire');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Voulez-vous supprimer ce commentaire ?')) return;

    try {
      await commentService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression du commentaire');
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-3 border-palabre-border border-t-palabre-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="bg-white border border-palabre-border rounded-card p-10 text-center max-w-md mx-auto my-12">
        <h2 className="text-xl font-bold text-palabre-text mb-2">
          Fiche introuvable
        </h2>

        <p className="text-xs sm:text-sm text-palabre-muted mb-6">
          Cette fiche technique n'existe pas ou a été archivée par son auteur.
        </p>

        <Link
          to="/search"
          className="px-4 py-2 bg-palabre-primary text-white rounded-btn text-xs font-semibold cursor-pointer"
        >
          Retour aux solutions
        </Link>
      </div>
    );
  }

  const isAuthor = Boolean(user && fiche && user.id === fiche.author_id);
  const canEdit = isAuthor || isModerator || isAdmin;
  const authorName = fiche.author?.display_name || 'Contributeur';

  const positiveConfirmations = confirmations.filter((c) => c.is_working);
  const negativeConfirmations = confirmations.filter((c) => !c.is_working);

  return (
    <div className="space-y-6 pb-16">
      {/* Barre de retour et actions auteur */}
      <div className="flex items-center justify-between">
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-palabre-primary hover:underline cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Retour aux résultats</span>
        </Link>

        {isAuthor ? (
          <Link
            to={`/fiches/${fiche.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-palabre-primary hover:bg-palabre-primaryHover text-white text-xs sm:text-sm font-semibold rounded-btn shadow-xs transition-colors cursor-pointer"
          >
            <Edit size={14} />
            <span>Modifier ma fiche</span>
          </Link>
        ) : (
          canEdit && (
            <Link
              to={`/fiches/${fiche.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-palabre-border hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-btn shadow-xs transition-colors cursor-pointer"
            >
              <Edit size={13} />
              <span>Modifier la fiche</span>
            </Link>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne principale */}
        <article className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge status={fiche.verification_status} />

              {fiche.category && (
                <span className="text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-slate-700 font-medium">
                  {fiche.category.name}
                </span>
              )}

              <span className="text-xs text-palabre-muted flex items-center gap-1">
                <Eye size={13} className="text-slate-400" />
                <span>{fiche.views_count || 0} consultations</span>
              </span>
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

              <span>
                Dernière vérification :{' '}
                {formatRelativeDate(fiche.last_validated_at || fiche.created_at)}
              </span>
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
                <strong className="font-semibold block mb-0.5">
                  Fiche contestée par la communauté
                </strong>

                {negativeConfirmations.length > 0
                  ? `${negativeConfirmations.length} développeur(s) ont signalé un échec ou une obsolescence de cette solution.`
                  : 'Cette fiche a fait l’objet de signalements nécessitant un réexamen.'}{' '}
                Prenez connaissance des retours ci-dessous avant d'appliquer.
              </div>
            </div>
          )}

          {/* Problème et contexte */}
          <section className="bg-white border border-palabre-border rounded-card p-5 space-y-3">
            <h2 className="text-base font-bold text-palabre-text">
              Problème rencontré
            </h2>

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
              <h2 className="text-base font-bold text-palabre-text mb-2">
                Prérequis
              </h2>

              <p className="text-sm text-palabre-text leading-relaxed">
                {fiche.prerequisites}
              </p>
            </section>
          )}

          {/* Étapes de résolution */}
          <section className="bg-white border border-palabre-border rounded-card p-5">
            <h2 className="text-base font-bold text-palabre-text mb-3">
              Étapes de résolution
            </h2>

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
                <h2 className="text-base font-bold text-palabre-text">
                  Extrait de code testé
                </h2>

                <span className="text-xs text-palabre-muted">
                  Exemple prêt à l'emploi
                </span>
              </div>

              <FicheCodeBlock
                code={fiche.code_snippet}
                language={fiche.language}
              />
            </section>
          )}

          {/* Erreurs fréquentes et limites */}
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
                <h2 className="text-base font-bold text-palabre-text">
                  Variantes contextuelles
                </h2>
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
                className="text-xs font-semibold text-palabre-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                + Proposer une variante
              </button>
            </div>

            {variants.length > 0 ? (
              <div className="space-y-3">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 bg-palabre-bg border border-palabre-border rounded-btn text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="font-semibold text-palabre-text text-sm">
                        {v.title}
                      </strong>

                      <span className="text-palabre-muted">
                        Par {v.author?.display_name || 'Dev'}
                      </span>
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
                      <FicheCodeBlock
                        code={v.code_snippet}
                        language={fiche.language}
                      />
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

          {/* Retours de test et confirmations */}
          <section className="bg-white border border-palabre-border rounded-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-palabre-text">
                Retours de test ({confirmations.length})
              </h2>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-palabre-ok font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  {positiveConfirmations.length} positif
                  {positiveConfirmations.length > 1 ? 's' : ''}
                </span>

                {negativeConfirmations.length > 0 && (
                  <span className="text-red-600 font-semibold flex items-center gap-1">
                    <AlertTriangle size={13} />
                    {negativeConfirmations.length} contestation
                    {negativeConfirmations.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {confirmations.length > 0 ? (
              <div className="space-y-2.5">
                {confirmations.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 border rounded-btn text-xs space-y-1 ${
                      c.is_working
                        ? 'border-slate-100 bg-slate-50'
                        : 'border-red-200 bg-red-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-palabre-text flex items-center gap-1.5">
                        {c.is_working ? (
                          <CheckCircle2 size={14} className="text-palabre-ok" />
                        ) : (
                          <AlertTriangle size={14} className="text-palabre-fl" />
                        )}

                        <span>{c.user?.display_name || 'Développeur'}</span>

                        <span className="text-[11px] font-normal text-slate-500">
                          ({c.is_working ? 'validé' : 'échec / obsolète'})
                        </span>
                      </span>

                      <span className="text-palabre-muted text-[11px]">
                        {formatFullDate(c.created_at)}
                      </span>
                    </div>

                    <div className="text-palabre-muted">
                      Contexte :{' '}
                      <span className="font-medium text-slate-700">
                        {c.country} ({c.operator_service})
                      </span>

                      {c.tested_version && (
                        <span> · Version : {c.tested_version}</span>
                      )}
                    </div>

                    {c.comment && (
                      <p className="text-palabre-text italic pt-1">
                        « {c.comment} »
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-palabre-muted">
                Soyez le premier développeur à tester et certifier cette solution dans votre environnement.
              </p>
            )}
          </section>

          {/* Commentaires de la communauté */}
          <section className="bg-white border border-palabre-border rounded-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-palabre-primary" />

              <h2 className="text-base font-bold text-palabre-text">
                Commentaires de la communauté ({comments.length})
              </h2>
            </div>

            {/* Formulaire nouveau commentaire */}
            <form onSubmit={handlePostComment} className="space-y-2">
              <textarea
                rows={3}
                placeholder={
                  user
                    ? 'Ajoutez une remarque, un conseil ou une précision sur cette solution...'
                    : 'Connectez-vous pour ajouter un commentaire constructif...'
                }
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={!user || isSubmittingComment}
                className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-xs sm:text-sm focus:outline-none focus:border-palabre-primary disabled:opacity-60"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-palabre-muted">
                  Échangez de manière constructive et bienveillante.
                </span>

                {user ? (
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    className="px-4 py-1.5 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send size={12} />
                    <span>
                      {isSubmittingComment ? 'Envoi...' : 'Commenter'}
                    </span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="px-3 py-1 bg-palabre-primary text-white rounded-btn text-xs font-semibold"
                  >
                    Se connecter
                  </Link>
                )}
              </div>
            </form>

            {/* Liste des commentaires */}
            {comments.length > 0 ? (
              <div className="space-y-3 pt-2 divide-y divide-slate-100">
                {comments.map((comment) => {
                  const isCommentAuthor = user?.id === comment.user_id;
                  const canDelete = isCommentAuthor || isModerator || isAdmin;

                  return (
                    <div
                      key={comment.id}
                      className="pt-3 first:pt-0 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-palabre-primaryLight text-palabre-primary text-xs font-bold flex items-center justify-center">
                            {(comment.user?.display_name?.[0] || 'D').toUpperCase()}
                          </div>

                          <span className="font-semibold text-xs text-palabre-text">
                            {comment.user?.display_name || 'Développeur'}
                          </span>

                          <span className="text-[11px] text-palabre-muted">
                            · {formatRelativeDate(comment.created_at)}
                          </span>
                        </div>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                            title="Supprimer mon commentaire"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 leading-relaxed pl-8 whitespace-pre-line">
                        {comment.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-palabre-muted pt-1">
                Aucun commentaire pour le moment. Posez vos questions ou partagez vos retours d'intégration.
              </p>
            )}
          </section>
        </article>

        {/* Sidebar communauté ou espace auteur */}
        <aside className="space-y-4">
          {isAuthor ? (
            <div className="bg-white border border-palabre-border rounded-card p-5 sticky top-20 shadow-xs space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold mb-2">
                  <User size={12} />
                  <span>Votre fiche technique</span>
                </div>
                <h3 className="font-bold text-base text-palabre-text mb-1">
                  Gestion de la solution
                </h3>
                <p className="text-xs text-palabre-muted leading-relaxed">
                  Vous êtes l’auteur de cette fiche technique. Les règles communautaires interdisent l’auto-certification afin de préserver l’objectivité des retours d’expérience.
                </p>
              </div>

              {/* Bouton principal bien visible pour modifier */}
              <div className="space-y-2 pt-1">
                <Link
                  to={`/fiches/${fiche.id}/edit`}
                  className="w-full py-2.5 px-4 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Edit size={16} />
                  <span>Modifier ma fiche</span>
                </Link>

                <Link
                  to="/dashboard"
                  className="w-full py-2 px-3 border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Accéder à mon tableau de bord</span>
                </Link>
              </div>

              {/* Métriques d'impact pour l'auteur */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <span className="font-semibold text-slate-700 block">
                  Impact communautaire :
                </span>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-palabre-bg border border-palabre-border rounded-btn">
                    <span className="text-base font-extrabold text-palabre-text block">
                      {fiche.views_count || 0}
                    </span>
                    <span className="text-[11px] text-palabre-muted">Consultations</span>
                  </div>
                  <div className="p-2 bg-palabre-bg border border-palabre-border rounded-btn">
                    <span className="text-base font-extrabold text-palabre-ok block">
                      {positiveConfirmations.length}
                    </span>
                    <span className="text-[11px] text-palabre-muted">Validations</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-palabre-muted">
                Dernière modification enregistrée :{' '}
                {formatRelativeDate(fiche.updated_at || fiche.created_at)}.
              </div>
            </div>
          ) : (
            <div className="bg-white border border-palabre-border rounded-card p-5 sticky top-20 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-base text-palabre-text mb-1">
                  Validation & Certification
                </h3>

                <p className="text-xs text-palabre-muted mb-2">
                  <span className="font-bold text-palabre-text text-sm">
                    {positiveConfirmations.length}
                  </span>{' '}
                  confirmation{positiveConfirmations.length > 1 ? 's' : ''}{' '}
                  positive{positiveConfirmations.length > 1 ? 's' : ''} pour :{' '}
                  <strong className="text-slate-700">{fiche.country}</strong>.
                </p>

                {userConfirmation && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-btn text-xs text-emerald-900 mb-2">
                    <span className="font-semibold block mb-0.5">
                      Votre retour de test est actif :
                    </span>

                    <span>
                      {userConfirmation.is_working
                        ? '✓ Confirmé fonctionnel'
                        : '✗ Signalé non fonctionnel'}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-1">
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

                  <span>
                    {userConfirmation ? 'Modifier mon avis' : 'Tester & Certifier'}
                  </span>
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
                  <Bookmark
                    size={15}
                    fill={isFavorite ? 'currentColor' : 'none'}
                  />

                  <span>
                    {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full py-2 px-3 border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {shareFeedback ? (
                    <>
                      <Check size={15} className="text-emerald-600" />
                      <span className="text-emerald-700">
                        Lien copié dans le presse-papier !
                      </span>
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
                <div>Règles de certification :</div>

                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>Seuil de certification : 3 confirmations positives</li>
                  <li>Les vues seules ne certifient jamais une fiche</li>
                  <li>Ne jamais poster de clés d'API ni secrets</li>
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Modals : la confirmation est masquée pour l'auteur */}
      {!isAuthor && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onSubmit={handleAddConfirmation}
          onDelete={userConfirmation ? handleDeleteConfirmation : undefined}
          defaultCountry={fiche.country}
          defaultOperator={fiche.operator_service}
          ficheTitle={fiche.title}
          existingConfirmation={userConfirmation}
        />
      )}

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
