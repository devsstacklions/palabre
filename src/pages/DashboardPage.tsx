
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ficheService } from '../services/fiche.service';
import { entraideService } from '../services/entraide.service';
import { FicheCard } from '../components/fiches/FicheCard';
import { Badge } from '../components/ui/Badge';
import { QuestionStatusBadge } from '../components/entraide/QuestionStatusBadge';
import { Fiche, FicheConfirmation, Question } from '../types';
import { formatRelativeDate } from '../lib/utils';
import {
  PlusCircle,
  Bookmark,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const DashboardPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [myFiches, setMyFiches] = useState<Fiche[]>([]);
  const [myDrafts, setMyDrafts] = useState<Fiche[]>([]);
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [recentReceivedConfirmations, setRecentReceivedConfirmations] =
    useState<(FicheConfirmation & { ficheTitle?: string })[]>([]);
  const [toVerifyFiches, setToVerifyFiches] = useState<Fiche[]>([]);
  const [confirmedFiches, setConfirmedFiches] = useState<Fiche[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;

      setIsLoading(true);

      try {
        const [
          userFichesRes,
          userDraftsRes,
          allPublishedRes,
          userQuestionsRes,
        ] = await Promise.allSettled([
          ficheService.getUserFiches(user.id),
          ficheService.getUserDrafts(user.id),
          ficheService.getFiches(),
          entraideService.getUserQuestions(user.id),
        ]);

        const userFiches = userFichesRes.status === 'fulfilled' ? userFichesRes.value : [];
        const userDrafts = userDraftsRes.status === 'fulfilled' ? userDraftsRes.value : [];
        const allPublished = allPublishedRes.status === 'fulfilled' ? allPublishedRes.value : [];
        const userQuestions = userQuestionsRes.status === 'fulfilled' ? userQuestionsRes.value : [];

        setMyFiches(userFiches);
        setMyDrafts(userDrafts);
        setMyQuestions(userQuestions);

        // Récupérer les confirmations reçues sur mes fiches
        if (userFiches.length > 0) {
          const userFicheIds = userFiches.map((f) => f.id);

          const { data: received } = await supabase
            .from('fiche_confirmations')
            .select(`
              *,
              user:profiles!user_id (
                display_name,
                username,
                avatar_url,
                country
              )
            `)
            .in('fiche_id', userFicheIds)
            .order('created_at', { ascending: false })
            .limit(6);

          if (received) {
            const mapped = received.map((c: any) => ({
              ...c,
              ficheTitle:
                userFiches.find((f) => f.id === c.fiche_id)?.title || 'Fiche',
            }));

            setRecentReceivedConfirmations(mapped);
          }
        }

        // Fiches à vérifier par la communauté dans mon contexte
        const toVerify = allPublished.filter(
          (f) =>
            f.author_id !== user.id &&
            (f.verification_status === 're' ||
              f.verification_status === 'new')
        );

        // Fiches certifiées
        const confirmed = allPublished.filter(
          (f) => f.verification_status === 'ok'
        );

        setToVerifyFiches(toVerify.slice(0, 4));
        setConfirmedFiches(confirmed.slice(0, 4));
      } catch (err) {
        console.error('Erreur chargement tableau de bord:', err);

        if (err instanceof Error) {
          console.error('Message :', err.message);
          console.error(
            'Détails :',
            JSON.stringify(err, null, 2)
          );
        } else {
          console.error('Détails inconnus :', err);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const displayName =
    profile?.display_name ||
    user?.email?.split('@')[0] ||
    'Développeur';

  // Statistiques réelles
  const totalConfirmationsReceived = myFiches.reduce(
    (acc, f) => acc + (f.confirmations_count || 0),
    0
  );

  const totalViews = myFiches.reduce(
    (acc, f) => acc + (f.views_count || 0),
    0
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Salutation et actions rapides */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-palabre-text tracking-tight mb-1">
            Bonjour {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-palabre-muted">
            Bienvenue sur votre espace d'échange technique et de suivi de vos
            contributions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/fiches/new"
            className="px-3.5 py-2 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-xs sm:text-sm font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Publier une fiche</span>
          </Link>

          <Link
            to="/entraide/new"
            className="px-3.5 py-2 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-btn text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle size={14} />
            <span>Poser un problème</span>
          </Link>

          <Link
            to="/profile?tab=fav"
            className="px-3 py-2 bg-white border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Bookmark size={14} />
            <span>Favoris</span>
          </Link>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-palabre-border rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-palabre-muted mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Mes fiches
            </span>
            <FileText size={16} className="text-palabre-primary" />
          </div>
          <p className="text-2xl font-bold text-palabre-text">
            {myFiches.length}
          </p>
          <span className="text-[11px] text-slate-500">
            publiée{myFiches.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="bg-white border border-palabre-border rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-palabre-muted mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Brouillons
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <p className="text-2xl font-bold text-palabre-text">
            {myDrafts.length}
          </p>
          <span className="text-[11px] text-slate-500">
            en cours de saisie
          </span>
        </div>

        <div className="bg-white border border-palabre-border rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-palabre-muted mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Confirmations
            </span>
            <CheckCircle2 size={16} className="text-palabre-ok" />
          </div>
          <p className="text-2xl font-bold text-palabre-text">
            {totalConfirmationsReceived}
          </p>
          <span className="text-[11px] text-slate-500">
            reçues de la communauté
          </span>
        </div>

        <div className="bg-white border border-palabre-border rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-palabre-muted mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Consultations
            </span>
            <Eye size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-palabre-text">
            {totalViews}
          </p>
          <span className="text-[11px] text-slate-500">
            vues sur vos solutions
          </span>
        </div>
      </div>

      {/* Mes fiches */}
      <section className="bg-white border border-palabre-border rounded-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-palabre-text">
            Mes publications récentes
          </h2>
          <Link
            to="/profile?tab=pub"
            className="text-xs font-semibold text-palabre-primary hover:underline flex items-center gap-1"
          >
            <span>Gérer toutes mes fiches</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {myFiches.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {myFiches.slice(0, 5).map((f) => (
              <div
                key={f.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={f.verification_status} />
                    <span className="text-xs text-palabre-muted">
                      {f.country} · {f.operator_service}
                    </span>
                  </div>
                  <Link
                    to={`/fiches/${f.id}`}
                    className="font-semibold text-sm text-palabre-text hover:text-palabre-primary transition-colors block"
                  >
                    {f.title}
                  </Link>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-palabre-muted">
                    {f.confirmations_count} confirmation
                    {f.confirmations_count > 1 ? 's' : ''}
                  </span>
                  <Link
                    to={`/fiches/${f.id}/edit`}
                    className="px-3 py-1 bg-palabre-bg hover:bg-slate-200 border border-palabre-border rounded-btn font-semibold text-slate-700 transition-colors"
                  >
                    Modifier
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-palabre-muted space-y-3">
            <p>Vous n'avez pas encore publié de fiche technique sur Palabre.</p>
            <Link
              to="/fiches/new"
              className="px-4 py-2 bg-palabre-primary text-white rounded-btn font-semibold inline-block"
            >
              Publier votre première solution
            </Link>
          </div>
        )}
      </section>

      {/* Questions d'entraide */}
      <section className="bg-white border border-palabre-border rounded-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-palabre-text flex items-center gap-2">
              <HelpCircle size={16} className="text-palabre-primary" />
              <span>Mes problèmes d'entraide ({myQuestions.length})</span>
            </h2>
            <p className="text-xs text-palabre-muted">
              Suivez les réponses apportées à vos questions et validez les solutions.
            </p>
          </div>
          <Link
            to="/entraide/new"
            className="text-xs font-semibold text-palabre-primary hover:underline flex items-center gap-1"
          >
            <span>Poser une question</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {myQuestions.length > 0 ? (
          <div className="space-y-2.5">
            {myQuestions.map((q) => (
              <div
                key={q.id}
                className="p-3.5 border border-palabre-border rounded-btn flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <QuestionStatusBadge status={q.status} />
                    <span className="text-[11px] font-semibold text-palabre-muted">
                      {q.technology}
                    </span>
                    <span className="text-[11px] text-palabre-muted">
                      · {formatRelativeDate(q.created_at)}
                    </span>
                  </div>
                  <Link
                    to={`/entraide/${q.id}`}
                    className="font-bold text-sm text-palabre-text hover:text-palabre-primary line-clamp-1"
                  >
                    {q.title}
                  </Link>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <MessageSquare size={13} />
                    <span>{q.answers_count} rép.</span>
                  </span>
                  <Link
                    to={`/entraide/${q.id}`}
                    className="px-3 py-1 bg-palabre-bg border border-palabre-border rounded-btn text-xs font-semibold text-palabre-text hover:bg-slate-100 transition-colors"
                  >
                    Consulter
                  </Link>
                  <Link
                    to={`/entraide/${q.id}/edit`}
                    className="p-1 text-palabre-muted hover:text-palabre-text"
                    title="Modifier"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-palabre-muted bg-palabre-bg/60 rounded-btn">
            Vous n'avez pas encore posé de question d'entraide.
          </div>
        )}
      </section>

      {/* Confirmations reçues */}
      {recentReceivedConfirmations.length > 0 && (
        <section className="bg-white border border-palabre-border rounded-card p-5 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-palabre-text">
            Derniers retours reçus sur vos fiches ({recentReceivedConfirmations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentReceivedConfirmations.map((c) => (
              <div
                key={c.id}
                className={`p-3 border rounded-btn text-xs space-y-1.5 ${
                  c.is_working
                    ? 'bg-slate-50 border-slate-100'
                    : 'bg-red-50/50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-palabre-text flex items-center gap-1.5">
                    {c.is_working ? (
                      <CheckCircle2 size={13} className="text-palabre-ok" />
                    ) : (
                      <AlertTriangle size={13} className="text-palabre-fl" />
                    )}
                    <span>{c.user?.display_name || 'Un développeur'}</span>
                  </span>
                  <span className="text-[11px] text-palabre-muted">
                    {formatRelativeDate(c.created_at)}
                  </span>
                </div>
                <div className="text-slate-600">
                  Sur : <strong className="text-slate-800">{c.ficheTitle}</strong> ({c.country})
                </div>
                {c.comment && (
                  <p className="text-slate-700 italic pt-0.5">« {c.comment} »</p>
                )}
                <div className="pt-1">
                  <Link
                    to={`/fiches/${c.fiche_id}`}
                    className="text-palabre-primary hover:underline text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <span>Consulter la fiche</span>
                    <ExternalLink size={10} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fiches à tester */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-palabre-text flex items-center gap-2">
              <Clock size={16} className="text-amber-600" />
              <span>À tester dans votre environnement</span>
            </h2>
            <p className="text-xs text-palabre-muted">
              Ces fiches ont besoin de tests récents pour confirmer leur fonctionnement.
            </p>
          </div>
          <Link
            to="/search?status=re"
            className="text-xs font-semibold text-palabre-primary hover:underline"
          >
            Voir tout
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white border border-palabre-border rounded-card p-4 h-40 animate-pulse"
              />
            ))}
          </div>
        ) : toVerifyFiches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toVerifyFiches.map((fiche) => (
              <FicheCard key={fiche.id} fiche={fiche} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-palabre-border rounded-card p-6 text-center text-xs text-palabre-muted">
            Toutes les fiches actuelles bénéficient de validations récentes.
          </div>
        )}
      </section>

      {/* Fiches certifiées */}
      {confirmedFiches.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-palabre-text flex items-center gap-2">
                <CheckCircle2 size={16} className="text-palabre-ok" />
                <span>Certifiées par la communauté</span>
              </h2>
              <p className="text-xs text-palabre-muted">
                Validées avec succès par au moins 3 développeurs indépendants.
              </p>
            </div>
            <Link
              to="/search?status=ok"
              className="text-xs font-semibold text-palabre-primary hover:underline"
            >
              Voir tout
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {confirmedFiches.map((fiche) => (
              <FicheCard key={fiche.id} fiche={fiche} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
