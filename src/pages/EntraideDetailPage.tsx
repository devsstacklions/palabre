import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { entraideService } from '../services/entraide.service';
import { useAuth } from '../contexts/AuthContext';
import { Question, QuestionAnswer } from '../types';
import { QuestionStatusBadge } from '../components/entraide/QuestionStatusBadge';
import { CodeBlock } from '../components/fiches/CodeBlock';
import { SecurityWarningBanner } from '../components/common/SecurityWarningBanner';
import { formatRelativeDate } from '../lib/utils';
import { CODE_LANGUAGES } from '../lib/constants';
import {
  ArrowLeft,
  CheckCircle2,
  Terminal,
  MessageSquare,
  Eye,
  Edit3,
  Trash2,
  Share2,
  ShieldAlert,
  Send,
  Lightbulb,
  ExternalLink,
  Check,
  Sparkles,
} from 'lucide-react';

export const EntraideDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isModerator, isAdmin, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Formulaire de réponse
  const [answerContent, setAnswerContent] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [answerLanguage, setAnswerLanguage] = useState('javascript');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState('');

  // Partage & Feedback
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [qRes, ansRes] = await Promise.allSettled([
        entraideService.getQuestionById(id),
        entraideService.getAnswers(id),
      ]);

      if (qRes.status === 'fulfilled') {
        setQuestion(qRes.value);
        if (!qRes.value) {
          setLoadError("Ce problème n'existe pas ou a été supprimé.");
        }
      } else {
        console.error('Erreur chargement question:', qRes.reason);
        setQuestion(null);
        setLoadError(
          qRes.reason instanceof Error
            ? qRes.reason.message
            : 'Erreur lors du chargement de la question.'
        );
      }

      if (ansRes.status === 'fulfilled') {
        setAnswers(ansRes.value);
      } else {
        console.warn('Erreur chargement réponses:', ansRes.reason);
        setAnswers([]);
      }
    } catch (err: any) {
      console.error('Erreur globale loadData:', err);
      setLoadError(err?.message || 'Erreur lors de la récupération des données.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Verrous anti-doublon pour garantir une seule incrémentation par consultation
  // (notamment lors du double montage en React 18 StrictMode, rerenders ou rechargement des réponses)
  const countedQuestionId = useRef<string | null>(null);
  const countingQuestionId = useRef<string | null>(null);

  // 1. Charger les données de la question et des réponses au montage ou changement d'identifiant
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Réinitialiser les verrous uniquement si la navigation change vers une autre question
  useEffect(() => {
    if (countedQuestionId.current && countedQuestionId.current !== id) {
      countedQuestionId.current = null;
    }
    if (countingQuestionId.current && countingQuestionId.current !== id) {
      countingQuestionId.current = null;
    }
  }, [id]);

  // 3. Incrémentation contrôlée, unique et persistante des consultations (vues)
  useEffect(() => {
    // Si pas d'identifiant, si l'authentification est encore en cours d'initialisation,
    // ou si la question n'est pas encore chargée / ne correspond pas à l'URL, on attend.
    if (!id || isAuthLoading || !question || question.id !== id) {
      return;
    }

    // RÈGLE MÉTIER STRICTE : L'auteur connecté ne doit JAMAIS générer de vues sur sa propre question
    if (user && user.id === question.author_id) {
      return;
    }

    // Protection anti-doublon synchrone en mémoire (évite l'effet de double montage React StrictMode)
    if (countedQuestionId.current === id || countingQuestionId.current === id) {
      return;
    }

    // Protection par session de navigation (sessionStorage) :
    // Évite les re-comptages artificiels répétés lors d'une même session ou lors d'un rafraîchissement (F5)
    const sessionKey = `palabre_viewed_question_${id}`;
    try {
      if (sessionStorage.getItem(sessionKey)) {
        countedQuestionId.current = id;
        return;
      }
    } catch {
      // Tolérance en cas de restriction de stockage
    }

    // Poser le verrou de traitement en cours
    countingQuestionId.current = id;

    try {
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // Tolérance
    }

    // Exécuter l'incrémentation persistante via la fonction RPC Supabase
    entraideService
      .incrementViews(id)
      .then(() => {
        countedQuestionId.current = id;
        // Mettre à jour l'affichage local de manière atomique (+1) sans double comptage
        setQuestion((prev) =>
          prev && prev.id === id ? { ...prev, views_count: prev.views_count + 1 } : prev
        );
      })
      .catch((err) => {
        console.warn('Impossible d’incrémenter les vues de la question :', err);
        try {
          sessionStorage.removeItem(sessionKey);
        } catch {
          // Tolérance
        }
      })
      .finally(() => {
        if (countingQuestionId.current === id) {
          countingQuestionId.current = null;
        }
      });
  }, [id, question?.id, question?.author_id, isAuthLoading, user?.id]);

  // Vérifier si l'utilisateur connecté est l'auteur de la question
  const isQuestionAuthor = Boolean(user && question && user.id === question.author_id);
  const canModerate = Boolean(isModerator || isAdmin);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeleteQuestion = async () => {
    if (!question) return;
    if (!window.confirm('Voulez-vous vraiment supprimer définitivement ce problème ?')) return;

    try {
      await entraideService.deleteQuestion(question.id);
      navigate('/entraide');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression.');
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !question) return;

    setAnswerError('');
    if (answerContent.trim().length < 5) {
      setAnswerError('Votre réponse doit comporter au moins 5 caractères.');
      return;
    }

    setIsSubmittingAnswer(true);
    try {
      const newAnswer = await entraideService.createAnswer(
        question.id,
        {
          content: answerContent,
          code_snippet: answerCode || null,
          code_language: answerLanguage,
        },
        user.id
      );

      setAnswers((prev) => [...prev, newAnswer]);
      setAnswerContent('');
      setAnswerCode('');
      setQuestion((prev) => (prev ? { ...prev, answers_count: prev.answers_count + 1 } : prev));
    } catch (err: any) {
      setAnswerError(err.message || "Erreur lors de l'envoi de la réponse.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleToggleSolution = async (answerId: string, currentIsSolution: boolean) => {
    if (!question) return;

    try {
      await entraideService.markAnswerAsSolution(question.id, answerId, !currentIsSolution);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour de la solution.');
    }
  };

  const handleDeleteAnswer = async (answerId: string) => {
    if (!window.confirm('Supprimer cette réponse ?')) return;

    try {
      await entraideService.deleteAnswer(answerId);
      setAnswers((prev) => prev.filter((a) => a.id !== answerId));
      setQuestion((prev) =>
        prev ? { ...prev, answers_count: Math.max(0, prev.answers_count - 1) } : prev
      );
    } catch (err: any) {
      alert(err.message || 'Erreur suppression réponse.');
    }
  };

  const handleReport = async () => {
    if (!user || !question) {
      navigate('/login');
      return;
    }
    const reason = window.prompt(
      'Motif du signalement (spam, inappropriate, security_risk, wrong_category, other) :'
    );
    if (!reason) return;
    const desc = window.prompt('Détaillez la raison du signalement :');
    if (!desc) return;

    try {
      await entraideService.reportQuestionOrAnswer({
        questionId: question.id,
        reason: reason as any,
        description: desc,
        userId: user.id,
      });
      alert('Signalement envoyé aux modérateurs.');
    } catch (err: any) {
      alert(err.message || 'Erreur signalement.');
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 py-8 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-40 bg-white border border-palabre-border rounded-card p-6" />
        <div className="h-24 bg-white border border-palabre-border rounded-card p-6" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-palabre-border rounded-card p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-bold text-palabre-text">Problème introuvable</h2>
        <p className="text-xs text-palabre-muted max-w-sm mx-auto">
          {loadError || "Ce problème a peut-être été supprimé, son identifiant est invalide ou il est en cours de révision."}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-white border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs font-semibold transition-colors cursor-pointer"
          >
            Réessayer
          </button>
          <Link
            to="/entraide"
            className="px-4 py-2 bg-palabre-primary hover:bg-[#0c4a3b] text-white rounded-btn text-xs font-semibold transition-colors"
          >
            Retour à l'entraide
          </Link>
        </div>
      </div>
    );
  }

  const acceptedAnswer = answers.find((a) => a.is_solution);
  const otherAnswers = answers.filter((a) => !a.is_solution);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Navigation retour */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/entraide"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-palabre-muted hover:text-palabre-text transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Toutes les questions d'entraide</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-palabre-border hover:bg-slate-50 rounded-btn text-xs font-semibold text-palabre-text transition-colors shadow-2xs cursor-pointer"
            title="Copier le lien direct"
          >
            {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
            <span>{copiedLink ? 'Lien copié !' : 'Partager'}</span>
          </button>

          {isQuestionAuthor && (
            <>
              <Link
                to={`/entraide/${question.id}/edit`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-palabre-border hover:bg-slate-50 rounded-btn text-xs font-semibold text-palabre-text transition-colors shadow-2xs"
              >
                <Edit3 size={14} />
                <span>Modifier</span>
              </Link>
              <button
                onClick={handleDeleteQuestion}
                className="p-1.5 text-palabre-muted hover:text-red-600 rounded-btn transition-colors cursor-pointer"
                title="Supprimer la question"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}

          {!isQuestionAuthor && user && (
            <button
              onClick={handleReport}
              className="p-1.5 text-palabre-muted hover:text-red-600 rounded-btn transition-colors cursor-pointer"
              title="Signaler un contenu abusif"
            >
              <ShieldAlert size={15} />
            </button>
          )}
        </div>
      </div>

      {/* CARTE PRINCIPALE DU PROBLÈME */}
      <article className="bg-white border border-palabre-border rounded-card p-6 space-y-6 shadow-xs">
        {/* En-tête question */}
        <div className="border-b border-palabre-border/70 pb-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <QuestionStatusBadge status={question.status} />

            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-palabre-bg border border-palabre-border text-palabre-text">
              {question.technology}
            </span>

            {question.framework && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700">
                {question.framework}
              </span>
            )}

            {question.language && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700">
                {question.language}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-palabre-text leading-snug">
            {question.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-palabre-muted">
            <span className="font-semibold text-palabre-text">
              {question.author?.display_name || question.author?.username || 'Développeur'}
            </span>
            {question.author?.country && <span>· {question.author.country}</span>}
            <span>· Publié {formatRelativeDate(question.created_at)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Eye size={13} /> {question.views_count} vue{question.views_count > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Corps de la question */}
        <div className="space-y-5 text-sm text-palabre-text leading-relaxed">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-palabre-muted mb-1.5">
              Description du problème
            </h2>
            <p className="whitespace-pre-wrap">{question.description}</p>
          </div>

          {/* Message d'erreur */}
          {question.error_message && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-palabre-muted mb-1.5 flex items-center gap-1.5">
                <Terminal size={14} className="text-amber-500" />
                Message d'erreur exact
              </h2>
              <div className="p-4 bg-[#0F1715] text-red-300 rounded-md font-mono text-xs border border-[#1C2C26] whitespace-pre-wrap selection:bg-red-950">
                {question.error_message}
              </div>
            </div>
          )}

          {/* Résultat attendu */}
          {question.expected_result && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-palabre-muted mb-1.5">
                Comportement / Résultat attendu
              </h2>
              <p className="p-3 bg-palabre-bg border border-palabre-border rounded-btn text-xs leading-relaxed text-palabre-text">
                {question.expected_result}
              </p>
            </div>
          )}

          {/* Outils et Environnement */}
          {(question.tools_version || question.environment) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-palabre-bg border border-palabre-border rounded-btn text-xs">
              {question.tools_version && (
                <div>
                  <span className="font-semibold text-palabre-text block mb-0.5">
                    Versions des outils :
                  </span>
                  <span className="text-palabre-muted font-mono">{question.tools_version}</span>
                </div>
              )}
              {question.environment && (
                <div>
                  <span className="font-semibold text-palabre-text block mb-0.5">
                    Environnement / OS :
                  </span>
                  <span className="text-palabre-muted font-mono">{question.environment}</span>
                </div>
              )}
            </div>
          )}

          {/* Extrait de code */}
          {question.code_snippet && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-palabre-muted mb-1.5">
                Extrait de code problématique
              </h2>
              <CodeBlock
                code={question.code_snippet}
                language={question.code_language || 'Code'}
              />
            </div>
          )}

          {/* Captures d'écran */}
          {question.attachments && question.attachments.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-palabre-muted mb-2">
                Captures d'écran jointes ({question.attachments.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {question.attachments.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group rounded-btn overflow-hidden border border-palabre-border hover:border-palabre-primary transition-all relative aspect-video bg-slate-100"
                  >
                    <img
                      src={url}
                      alt={`Capture ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                      <ExternalLink size={14} />
                      <span>Agrandir</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* LIEN AVEC LES FICHES DE TERRAIN : PROPOSER TRANSFORMATION SI RÉSOLU */}
      {question.status === 'resolved' && acceptedAnswer && (
        <section className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-2 border-emerald-300 rounded-card p-5 space-y-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-btn shrink-0">
              <Lightbulb size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                <span>Cette solution peut devenir une fiche de terrain validée</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Processus Communautaire
                </span>
              </h2>
              <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                Le problème a été résolu avec succès ! Vous pouvez initier la transformation de cette solution
                en fiche technique de terrain. La fiche sera pré-remplie en brouillon et devra être complétée (étapes pas-à-pas, pays, opérateur) avant de suivre le processus normal de certification par la communauté.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Link
              to={`/fiches/new?from_question=${question.id}&answer_id=${acceptedAnswer.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-btn shadow-sm transition-colors"
            >
              <Sparkles size={16} />
              <span>Transformer en fiche de terrain</span>
            </Link>
          </div>
        </section>
      )}

      {/* SECTION DES RÉPONSES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-palabre-text flex items-center gap-2">
            <MessageSquare size={18} className="text-palabre-primary" />
            <span>
              {answers.length} réponse{answers.length > 1 ? 's' : ''}
            </span>
          </h2>
        </div>

        {/* Réponse acceptée mise en valeur en premier */}
        {acceptedAnswer && (
          <div className="bg-emerald-50/70 border-2 border-emerald-400 rounded-card p-5 space-y-4 shadow-xs relative">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                  <CheckCircle2 size={14} />
                  Solution acceptée par l'auteur
                </span>
                <span className="text-xs font-semibold text-emerald-950">
                  {acceptedAnswer.author?.display_name || 'Contributeur'}
                </span>
                <span className="text-xs text-emerald-800">
                  · {formatRelativeDate(acceptedAnswer.created_at)}
                </span>
              </div>

              {(isQuestionAuthor || canModerate) && (
                <button
                  type="button"
                  onClick={() => handleToggleSolution(acceptedAnswer.id, true)}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                >
                  Retirer comme solution
                </button>
              )}
            </div>

            <p className="text-sm text-emerald-950 whitespace-pre-wrap leading-relaxed">
              {acceptedAnswer.content}
            </p>

            {acceptedAnswer.code_snippet && (
              <CodeBlock
                code={acceptedAnswer.code_snippet}
                language={acceptedAnswer.code_language || 'Code'}
              />
            )}
          </div>
        )}

        {/* Autres réponses */}
        {otherAnswers.map((ans) => {
          const isAnswerAuthor = Boolean(user && user.id === ans.author_id);
          return (
            <div
              key={ans.id}
              className="bg-white border border-palabre-border rounded-card p-5 space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-palabre-border pb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-palabre-text">
                    {ans.author?.display_name || ans.author?.username || 'Contributeur'}
                  </span>
                  {ans.author?.country && (
                    <span className="text-palabre-muted">· {ans.author.country}</span>
                  )}
                  <span className="text-palabre-muted">· {formatRelativeDate(ans.created_at)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {(isQuestionAuthor || canModerate) && (
                    <button
                      type="button"
                      onClick={() => handleToggleSolution(ans.id, false)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-btn border border-emerald-300 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Valider comme solution</span>
                    </button>
                  )}

                  {(isAnswerAuthor || canModerate) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAnswer(ans.id)}
                      className="p-1 text-palabre-muted hover:text-red-600 rounded-btn transition-colors cursor-pointer"
                      title="Supprimer cette réponse"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-palabre-text whitespace-pre-wrap leading-relaxed">
                {ans.content}
              </p>

              {ans.code_snippet && (
                <CodeBlock code={ans.code_snippet} language={ans.code_language || 'Code'} />
              )}
            </div>
          );
        })}

        {answers.length === 0 && (
          <div className="bg-white border border-palabre-border rounded-card p-8 text-center text-xs text-palabre-muted">
            Aucune réponse pour le moment. Soyez le premier à proposer une solution !
          </div>
        )}
      </section>

      {/* FORMULAIRE DE PROPOSITION DE RÉPONSE */}
      <section className="bg-white border border-palabre-border rounded-card p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-palabre-text flex items-center gap-2">
          <Send size={16} className="text-palabre-primary" />
          <span>Proposer une réponse ou une piste de solution</span>
        </h2>

        {!user ? (
          <div className="p-4 bg-palabre-bg border border-palabre-border rounded-btn text-xs text-palabre-muted flex items-center justify-between gap-4">
            <span>Vous devez être connecté pour répondre à cette question.</span>
            <Link
              to="/login"
              className="px-3 py-1.5 bg-palabre-primary text-white rounded-btn font-semibold hover:bg-[#0c4a3b] transition-colors"
            >
              Se connecter
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <SecurityWarningBanner />

            {answerError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-btn">
                {answerError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Votre réponse détaillée *
              </label>
              <textarea
                rows={4}
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="Expliquez précisément la cause du problème et les étapes pour le corriger..."
                className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-sm text-palabre-text focus:outline-none focus:ring-1 focus:ring-palabre-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-palabre-text">
                  Extrait de code correctif (optionnel)
                </label>
                <select
                  value={answerLanguage}
                  onChange={(e) => setAnswerLanguage(e.target.value)}
                  className="text-xs px-2 py-1 bg-palabre-bg border border-palabre-border rounded-btn text-palabre-text"
                >
                  {CODE_LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={5}
                value={answerCode}
                onChange={(e) => setAnswerCode(e.target.value)}
                placeholder="// Collez ici la solution ou la correction de code..."
                className="w-full p-3 bg-palabre-codeBg text-palabre-codeText font-mono text-xs rounded-btn border border-palabre-border leading-relaxed focus:outline-none focus:ring-1 focus:ring-palabre-primary"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmittingAnswer}
                className="px-5 py-2.5 bg-palabre-primary hover:bg-[#0c4a3b] text-white rounded-btn text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Send size={14} />
                <span>{isSubmittingAnswer ? 'Envoi...' : 'Publier ma réponse'}</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
