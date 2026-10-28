import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ficheFormSchema, FicheFormData } from '../schemas/fiche.schema';
import { PAYS, SERVICES, TECHNOLOGIES } from '../lib/constants';
import { ficheService } from '../services/fiche.service';
import { useAuth } from '../contexts/AuthContext';
import { CodeBlock } from '../components/fiches/CodeBlock';
import { entraideService } from '../services/entraide.service';
import { Eye, Send, Save, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const NewFichePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const fromQuestionId = searchParams.get('from_question');
  const targetId = id || draftId;

  const [fromQuestionInfo, setFromQuestionInfo] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingExisting, setIsLoadingExisting] = useState(Boolean(targetId));

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FicheFormData>({
    resolver: zodResolver(ficheFormSchema),
    defaultValues: {
      title: '',
      country: '',
      operator_service: '',
      language: '',
      api_version: '',
      problem: '',
      prerequisites: '',
      steps: '',
      code_snippet: '',
      frequent_errors: '',
      known_limits: '',
      status: 'published',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (targetId) {
      setIsLoadingExisting(true);
      ficheService
        .getFicheById(targetId)
        .then((f) => {
          if (f) {
            reset({
              title: f.title,
              country: f.country,
              operator_service: f.operator_service,
              language: f.language,
              api_version: f.api_version || '',
              problem: f.problem,
              prerequisites: f.prerequisites || '',
              steps: f.steps ? f.steps.join('\n') : '',
              code_snippet: f.code_snippet || '',
              frequent_errors: f.frequent_errors || '',
              known_limits: f.known_limits || '',
              status: f.status === 'draft' ? 'draft' : 'published',
            });
          }
        })
        .catch((err) => {
          console.error('Erreur chargement fiche existante:', err);
        })
        .finally(() => {
          setIsLoadingExisting(false);
        });
    }
  }, [targetId, reset]);

  // Pré-remplissage depuis un problème d'entraide résolu
  useEffect(() => {
    if (fromQuestionId && !targetId) {
      entraideService.getQuestionById(fromQuestionId).then((q) => {
        if (!q) return;
        setFromQuestionInfo(q.title);
        setValue('title', q.title.startsWith('[Solution]') ? q.title : `[Solution] ${q.title}`, { shouldValidate: true });
        setValue('language', q.technology || q.language || '', { shouldValidate: true });
        const contextText = `Contexte initial (issu de l'entraide technique) :\n${q.description}${
          q.error_message ? `\n\nErreur rencontrée :\n${q.error_message}` : ''
        }${q.expected_result ? `\n\nRésultat attendu :\n${q.expected_result}` : ''}`;
        setValue('problem', contextText, { shouldValidate: true });

        if (q.accepted_answer?.code_snippet) {
          setValue('code_snippet', q.accepted_answer.code_snippet);
        } else if (q.code_snippet) {
          setValue('code_snippet', q.code_snippet);
        }
      });
    }
  }, [fromQuestionId, targetId, setValue]);

  const watchedValues = watch();

  // 4 champs obligatoires définis dans le prototype
  const requiredCount = [
    Boolean(watchedValues.title?.trim()),
    Boolean(watchedValues.country),
    Boolean(watchedValues.problem?.trim()),
    Boolean(watchedValues.steps?.trim()),
  ].filter(Boolean).length;

  const progressPercent = requiredCount * 25;

  const onSubmit = async (
    data: FicheFormData,
    forcedStatus?: 'draft' | 'published'
  ) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setErrorMessage('');
    setSaveSuccessMessage('');

    const payload = {
      ...data,
      status: forcedStatus ?? data.status ?? 'published',
    };

    try {
      if (targetId) {
        const updated = await ficheService.updateFiche(targetId, payload);

        if (payload.status === 'draft') {
          setSaveSuccessMessage('Brouillon sauvegardé avec succès !');
          setTimeout(() => navigate('/dashboard'), 1000);
        } else {
          setSaveSuccessMessage('Fiche publiée avec succès dans Palabre !');
          setTimeout(() => navigate(`/fiches/${updated.id}`), 1000);
        }
      } else {
        const created = await ficheService.createFiche(payload, user.id);

        if (payload.status === 'draft') {
          setSaveSuccessMessage('Brouillon sauvegardé avec succès !');
          setTimeout(() => navigate('/dashboard'), 1000);
        } else {
          setSaveSuccessMessage('Fiche publiée avec succès dans Palabre !');
          setTimeout(() => navigate(`/fiches/${created.id}`), 1000);
        }
      }
    } catch (err: unknown) {
      console.error('Erreur enregistrement fiche :', err);
      let msg = 'Erreur lors de l’enregistrement de la fiche';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as Record<string, any>;
        msg = errorObj.message || errorObj.error_description || errorObj.details || msg;
      }
      setErrorMessage(msg);
    }
  };

  const handleSaveDraft = () => {
    void handleSubmit((data) => onSubmit(data, 'draft'))();
  };

  const handlePublish = () => {
    void handleSubmit((data) => onSubmit(data, 'published'))();
  };

  if (isLoadingExisting) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-3 border-palabre-border border-t-palabre-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-palabre-text tracking-tight mb-1">
            {id ? 'Modifier la fiche technique' : 'Nouvelle fiche de terrain'}
          </h1>
          <p className="text-xs sm:text-sm text-palabre-muted">
            Partagez une solution testée avec vos pairs pour enrichir la base de connaissances africaine.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="px-3.5 py-1.5 border border-palabre-border hover:bg-white text-palabre-text rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {isPreview ? <ArrowLeft size={14} /> : <Eye size={14} />}
          <span>{isPreview ? 'Éditer' : 'Prévisualiser'}</span>
        </button>
      </div>

      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-card text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {fromQuestionInfo && (
        <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-card text-xs text-emerald-950 flex items-start gap-3">
          <Sparkles size={18} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Fiche pré-remplie à partir de l'entraide technique</p>
            <p className="leading-relaxed text-emerald-900">
              Cette fiche a été initialisée à partir de la question « <strong>{fromQuestionInfo}</strong> ».
              Pour qu'elle devienne une fiche de terrain validée par la communauté, veillez à renseigner le <strong>pays</strong>, l'<strong>opérateur ou service</strong> et détaillez les <strong>étapes de mise en place</strong>.
              Elle sera ensuite soumise au processus de certification collaborative.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-card text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mode Prévisualisation */}
      {isPreview ? (
        <div className="bg-white border border-palabre-border rounded-card p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-semibold text-palabre-primary bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mb-2 inline-block">
              Aperçu en direct
            </span>
            <h2 className="text-2xl font-bold text-palabre-text mb-2">
              {watchedValues.title || 'Titre de votre solution'}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs bg-palabre-bg border border-palabre-border px-2 py-0.5 rounded-full font-medium">
                {watchedValues.country || 'Pays non défini'}
              </span>
              <span className="text-xs bg-palabre-bg border border-palabre-border px-2 py-0.5 rounded-full font-medium">
                {watchedValues.operator_service || 'Opérateur non défini'}
              </span>
              <span className="text-xs bg-palabre-bg border border-palabre-border px-2 py-0.5 rounded-full font-medium">
                {watchedValues.language || 'Technologie non définie'}
              </span>
              {watchedValues.api_version && (
                <span className="text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-mono text-slate-700">
                  {watchedValues.api_version}
                </span>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-sm text-palabre-text mb-1">Problème</h3>
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {watchedValues.problem || 'Description du problème...'}
            </p>
          </div>

          {watchedValues.prerequisites && (
            <div>
              <h3 className="font-bold text-sm text-palabre-text mb-1">Prérequis</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {watchedValues.prerequisites}
              </p>
            </div>
          )}

          <div>
            <h3 className="font-bold text-sm text-palabre-text mb-2">Étapes de résolution</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-700">
              {watchedValues.steps
                ?.split('\n')
                .filter(Boolean)
                .map((step, idx) => (
                  <li key={idx}>{step}</li>
                )) || <li>Aucune étape saisie.</li>}
            </ol>
          </div>

          {watchedValues.code_snippet && (
            <div>
              <h3 className="font-bold text-sm text-palabre-text mb-1">Extrait de code</h3>
              <CodeBlock code={watchedValues.code_snippet} language={watchedValues.language} />
            </div>
          )}

          {(watchedValues.frequent_errors || watchedValues.known_limits) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watchedValues.frequent_errors && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-btn text-xs">
                  <span className="font-bold block mb-1">Erreurs fréquentes :</span>
                  <p>{watchedValues.frequent_errors}</p>
                </div>
              )}
              {watchedValues.known_limits && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-btn text-xs">
                  <span className="font-bold block mb-1">Limites et restrictions :</span>
                  <p>{watchedValues.known_limits}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className="px-4 py-2 border border-palabre-border rounded-btn text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Retour à la saisie
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isSubmitting}
              className="px-5 py-2 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>{id ? 'Enregistrer les modifications' : 'Publier cette fiche'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Formulaire de saisie */
        <div className="bg-white border border-palabre-border rounded-card p-6 shadow-xs space-y-6">
          {/* Progression */}
          <div>
            <div
              className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200"
              role="progressbar"
              aria-label="Progression du formulaire"
            >
              <div
                className="h-full bg-palabre-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-palabre-muted mt-2 font-medium">
              {requiredCount}/4 champs obligatoires remplis
            </p>
          </div>

          <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-6">
            {/* 1. Contexte */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-palabre-text border-b border-slate-100 pb-2">
                1. Contexte
              </h2>

              <div>
                <label className="block text-xs font-semibold text-palabre-text mb-1">
                  Titre descriptif de la fiche *
                </label>
                <input
                  type="text"
                  placeholder="Ex. : Intégrer Wave dans une application web au Sénégal"
                  {...register('title')}
                  className={`w-full px-3.5 py-2.5 bg-palabre-bg border rounded-btn text-sm ${
                    errors.title ? 'border-red-500' : 'border-palabre-border'
                  }`}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-palabre-text mb-1">
                    Pays concerné *
                  </label>
                  <select
                    {...register('country')}
                    className={`w-full px-3.5 py-2.5 bg-palabre-bg border rounded-btn text-sm ${
                      errors.country ? 'border-red-500' : 'border-palabre-border'
                    }`}
                  >
                    <option value="">Sélectionnez un pays</option>
                    {PAYS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="text-xs text-red-500 mt-1">{errors.country.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-palabre-text mb-1">
                    Opérateur ou service *
                  </label>
                  <select
                    {...register('operator_service')}
                    className={`w-full px-3.5 py-2.5 bg-palabre-bg border rounded-btn text-sm ${
                      errors.operator_service ? 'border-red-500' : 'border-palabre-border'
                    }`}
                  >
                    <option value="">Sélectionnez un service</option>
                    {SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {errors.operator_service && (
                    <p className="text-xs text-red-500 mt-1">{errors.operator_service.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-palabre-text mb-1">
                    Technologie ou langage *
                  </label>
                  <select
                    {...register('language')}
                    className={`w-full px-3.5 py-2.5 bg-palabre-bg border rounded-btn text-sm ${
                      errors.language ? 'border-red-500' : 'border-palabre-border'
                    }`}
                  >
                    <option value="">Sélectionnez une technologie</option>
                    {TECHNOLOGIES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {errors.language && (
                    <p className="text-xs text-red-500 mt-1">{errors.language.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-palabre-text mb-1">
                    Version d'API ou SDK (facultatif)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex. : v2, Checkout API 1.0"
                    {...register('api_version')}
                    className="w-full px-3.5 py-2.5 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 2. Solution */}
            <div className="space-y-4 pt-2">
              <h2 className="text-base font-bold text-palabre-text border-b border-slate-100 pb-2">
                2. Solution
              </h2>

              <div>
                <label className="block text-xs font-semibold text-palabre-text mb-1">
                  Description du problème *
                </label>
                <textarea
                  rows={3}
                  placeholder="Expliquez la situation, le code d'erreur ou le besoin spécifique rencontré..."
                  {...register('problem')}
                  className={`w-full px-3.5 py-2.5 bg-palabre-bg border rounded-btn text-sm ${
                    errors.problem ? 'border-red-500' : 'border-palabre-border'
                  }`}
                />
                {errors.problem && (
                  <p className="text-xs text-red-500 mt-1">{errors.problem.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-palabre-text mb-1">
                  Prérequis (facultatif)
                </label>
                <input
                  type="text"
                  placeholder="Ex. : Compte marchand actif, URL publique en HTTPS"
                  {...register('prerequisites')}
                  className="w-full px-3.5 py-2.5 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-palabre-text mb-1">
                  Étapes de résolution * (une par ligne)
                </label>
                <textarea
                  rows={4}
                  placeholder="1. Créer la session côté serveur&#10;2. Rediriger le client vers l'URL retournée&#10;3. Traiter le callback webhook et vérifier le hash"
                  {...register('steps')}
                  className={`w-full px-3.5 py-2.5 bg-palabre-bg border rounded-btn text-sm ${
                    errors.steps ? 'border-red-500' : 'border-palabre-border'
                  }`}
                />
                {errors.steps && (
                  <p className="text-xs text-red-500 mt-1">{errors.steps.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-palabre-text mb-1">
                  Extrait de code testé (facultatif)
                </label>
                <textarea
                  rows={6}
                  placeholder="// Code prêt à l'emploi (sans clés réelles)..."
                  {...register('code_snippet')}
                  className="w-full px-3.5 py-2.5 bg-palabre-bg border border-palabre-border rounded-btn text-sm font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* 3. Vérification */}
            <div className="space-y-4 pt-2">
              <h2 className="text-base font-bold text-palabre-text border-b border-slate-100 pb-2">
                3. Vérification & Limites
              </h2>

              <div>
                <label className="block text-xs font-semibold text-palabre-text mb-1">
                  Erreurs fréquentes observées (facultatif)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex. : Erreur 401 si le secret n'est pas envoyé en base64, timeout sur les gros volumes"
                  {...register('frequent_errors')}
                  className="w-full px-3.5 py-2.5 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-palabre-text mb-1">
                  Erreurs ou limites connues (facultatif)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex. : Testé uniquement sur le sandbox pour le moment, non testé en Côte d'Ivoire"
                  {...register('known_limits')}
                  className="w-full px-3.5 py-2.5 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPreview(true)}
                className="px-4 py-2.5 border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye size={15} />
                <span>Prévisualiser</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>Enregistrer le brouillon</span>
                </button>

                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-xs sm:text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{id ? 'Mettre à jour' : 'Publier la fiche'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
