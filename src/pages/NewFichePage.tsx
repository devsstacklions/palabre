import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ficheFormSchema, FicheFormData } from '../schemas/fiche.schema';
import { PAYS, SERVICES, TECHNOLOGIES } from '../lib/constants';
import { ficheService } from '../services/fiche.service';
import { useAuth } from '../contexts/AuthContext';
import { CodeBlock } from '../components/fiches/CodeBlock';
import { Eye, Send, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const NewFichePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPreview, setIsPreview] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  const watchedValues = watch();

  // 4 champs obligatoires définis dans le prototype
  const requiredCount = [
    Boolean(watchedValues.title?.trim()),
    Boolean(watchedValues.country),
    Boolean(watchedValues.problem?.trim()),
    Boolean(watchedValues.steps?.trim()),
  ].filter(Boolean).length;

  const progressPercent = requiredCount * 25;

  const onSubmit = async (data: FicheFormData) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const created = await ficheService.createFiche(data, user.id);
      if (data.status === 'draft') {
        setSaveSuccessMessage('Brouillon sauvegardé avec succès !');
        setTimeout(() => navigate('/search'), 1500);
      } else {
        navigate(`/fiches/${created.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création de la fiche');
    }
  };

  const handleSaveDraft = () => {
    setValue('status', 'draft');
    handleSubmit(onSubmit)();
  };

  const handlePublish = () => {
    setValue('status', 'published');
    handleSubmit(onSubmit)();
  };

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-palabre-text tracking-tight mb-1">
            Nouvelle fiche de terrain
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
                {watchedValues.country || 'Pays'}
              </span>
              <span className="text-xs bg-palabre-bg border border-palabre-border px-2 py-0.5 rounded-full font-medium">
                {watchedValues.operator_service || 'Opérateur'}
              </span>
              <span className="text-xs bg-palabre-bg border border-palabre-border px-2 py-0.5 rounded-full font-medium">
                {watchedValues.language || 'Technologie'}
              </span>
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
              <span>Publier cette fiche</span>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  <Send size={15} />
                  <span>Publier la fiche</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

