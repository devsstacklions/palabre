import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { entraideService } from '../services/entraide.service';
import { questionFormSchema } from '../schemas/entraide.schema';
import { SecurityWarningBanner } from '../components/common/SecurityWarningBanner';
import { CodeBlock } from '../components/fiches/CodeBlock';
import { TECHNOLOGIES, CODE_LANGUAGES } from '../lib/constants';
import {
  ArrowLeft,
  Eye,
  Edit3,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';

export const NewQuestionPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: editQuestionId } = useParams<{ id?: string }>();
  const isEditing = Boolean(editQuestionId);

  // États du formulaire
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technology, setTechnology] = useState('');
  const [availableTechnologies, setAvailableTechnologies] = useState<string[]>([...TECHNOLOGIES]);
  const [isCustomTech, setIsCustomTech] = useState(false);
  const [language, setLanguage] = useState('');
  const [framework, setFramework] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [toolsVersion, setToolsVersion] = useState('');
  const [environment, setEnvironment] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [attachments, setAttachments] = useState<string[]>([]);

  // Charger les technologies dynamiques disponibles
  useEffect(() => {
    entraideService.getDistinctTechnologies().then((techs) => {
      if (techs && techs.length > 0) {
        setAvailableTechnologies(techs);
      }
    });
  }, []);

  // États UI
  const [isPreview, setIsPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  // Chargement en mode édition
  useEffect(() => {
    if (!editQuestionId) return;

    entraideService.getQuestionById(editQuestionId).then((q) => {
      if (!q) {
        navigate('/entraide');
        return;
      }
      if (user && q.author_id !== user.id) {
        alert('Vous ne pouvez modifier que vos propres questions.');
        navigate(`/entraide/${editQuestionId}`);
        return;
      }

      setTitle(q.title);
      setDescription(q.description);
      setTechnology(q.technology);
      if (q.technology && !TECHNOLOGIES.includes(q.technology as any)) {
        setIsCustomTech(true);
      }
      setLanguage(q.language || '');
      setFramework(q.framework || '');
      setErrorMessage(q.error_message || '');
      setExpectedResult(q.expected_result || '');
      setToolsVersion(q.tools_version || '');
      setEnvironment(q.environment || '');
      setCodeSnippet(q.code_snippet || '');
      setCodeLanguage(q.code_language || 'javascript');
      setAttachments(q.attachments || []);
    });
  }, [editQuestionId, user, navigate]);

  // Gestion de l'upload d'images
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);
    setGeneralError('');
    try {
      const uploadPromises = Array.from(files).map((file) =>
        entraideService.uploadAttachment(file, user.id)
      );
      const uploadedUrls = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setGeneralError(err.message || "Erreur lors de l'envoi de la capture d'écran.");
    } finally {
      setIsUploading(false);
      // Réinitialiser le champ pour permettre de re-sélectionner le même fichier
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (targetStatus: 'open' | 'draft') => {
    if (!user) {
      navigate('/login');
      return;
    }

    setErrors({});
    setGeneralError('');

    const payload = {
      title,
      description,
      technology,
      language: language || null,
      framework: framework || null,
      error_message: errorMessage || null,
      expected_result: expectedResult || null,
      tools_version: toolsVersion || null,
      environment: environment || null,
      code_snippet: codeSnippet || null,
      code_language: codeLanguage,
      attachments,
      status: targetStatus,
    };

    const parseResult = questionFormSchema.safeParse(payload);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        fieldErrors[fieldName] = issue.message;
      });
      setErrors(fieldErrors);
      setIsPreview(false); // Revenir à l'édition pour voir les erreurs
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editQuestionId) {
        await entraideService.updateQuestion(editQuestionId, parseResult.data);
        navigate(`/entraide/${editQuestionId}`);
      } else {
        const created = await entraideService.createQuestion(parseResult.data, user.id);
        navigate(`/entraide/${created.id}`);
      }
    } catch (err: any) {
      setGeneralError(err.message || "Erreur lors de l'enregistrement de votre question.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Barre supérieure avec retour et bouton Aperçu */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/entraide"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-palabre-muted hover:text-palabre-text transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Retour à l'entraide</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold border border-palabre-border bg-white text-palabre-text hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          {isPreview ? (
            <>
              <Edit3 size={14} />
              <span>Reprendre l'édition</span>
            </>
          ) : (
            <>
              <Eye size={14} />
              <span>Aperçu de la question</span>
            </>
          )}
        </button>
      </div>

      {/* Titre de page */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-palabre-text">
          {isEditing ? 'Modifier votre problème' : 'Poser un problème technique'}
        </h1>
        <p className="text-xs sm:text-sm text-palabre-muted mt-0.5">
          Fournissez le plus de contexte possible pour permettre à un autre développeur de reproduire et résoudre votre cas.
        </p>
      </div>

      {/* Bannière de sécurité */}
      <SecurityWarningBanner />

      {generalError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-card flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* MODE APERÇU SANS PERTE DE DONNÉES */}
      {isPreview ? (
        <div className="bg-white border border-palabre-border rounded-card p-6 space-y-6 shadow-xs">
          <div className="border-b border-palabre-border pb-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-300">
                Aperçu · Ouvert
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-palabre-bg border border-palabre-border text-palabre-text">
                {technology || 'Technologie non spécifiée'}
              </span>
              {framework && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700">
                  {framework}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-palabre-text">
              {title || 'Titre de la question (non renseigné)'}
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-palabre-muted mb-1.5">
                Description du problème
              </h3>
              <p className="text-sm text-palabre-text whitespace-pre-wrap leading-relaxed">
                {description || 'Aucune description fournie.'}
              </p>
            </div>

            {errorMessage && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-palabre-muted mb-1.5">
                  Message d'erreur exact
                </h3>
                <div className="p-3 bg-[#0F1715] text-red-300 rounded-md font-mono text-xs border border-[#1C2C26] whitespace-pre-wrap">
                  {errorMessage}
                </div>
              </div>
            )}

            {expectedResult && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-palabre-muted mb-1.5">
                  Résultat attendu
                </h3>
                <p className="text-sm text-palabre-text leading-relaxed">{expectedResult}</p>
              </div>
            )}

            {(toolsVersion || environment) && (
              <div className="p-3 bg-palabre-bg border border-palabre-border rounded-btn text-xs text-palabre-muted space-y-1">
                {toolsVersion && (
                  <p>
                    <strong className="text-palabre-text">Versions des outils :</strong> {toolsVersion}
                  </p>
                )}
                {environment && (
                  <p>
                    <strong className="text-palabre-text">Environnement / OS :</strong> {environment}
                  </p>
                )}
              </div>
            )}

            {codeSnippet && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-palabre-muted mb-1.5">
                  Extrait de code problématique
                </h3>
                <CodeBlock code={codeSnippet} language={codeLanguage} />
              </div>
            )}

            {attachments.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-palabre-muted mb-2">
                  Captures d'écran ({attachments.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {attachments.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-video rounded-btn overflow-hidden border border-palabre-border hover:opacity-90"
                    >
                      <img src={url} alt={`Capture ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-palabre-border">
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className="px-4 py-2 border border-palabre-border rounded-btn text-xs font-semibold text-palabre-text hover:bg-slate-50 transition-colors"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('open')}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-palabre-primary hover:bg-[#0c4a3b] text-white rounded-btn text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Publication en cours...' : 'Publier ce problème'}
            </button>
          </div>
        </div>
      ) : (
        /* FORMULAIRE DE SAISIE */
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit('open');
          }}
          className="bg-white border border-palabre-border rounded-card p-6 space-y-5 shadow-xs"
        >
          {/* Titre */}
          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Titre du problème *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Erreur 401 avec le webhook Wave Checkout sur Node.js Express"
              className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm text-palabre-text focus:outline-none focus:ring-1 ${
                errors.title ? 'border-red-500 focus:ring-red-500' : 'border-palabre-border focus:ring-palabre-primary'
              }`}
              required
            />
            {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Technologie, Langage, Framework */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-palabre-text">
                  Technologie principale *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomTech(!isCustomTech);
                    setTechnology('');
                  }}
                  className="text-[11px] font-semibold text-palabre-primary hover:underline cursor-pointer"
                >
                  {isCustomTech ? 'Choisir dans la liste' : '+ Autre technologie'}
                </button>
              </div>

              {isCustomTech ? (
                <div>
                  <input
                    type="text"
                    value={technology}
                    onChange={(e) => setTechnology(e.target.value)}
                    placeholder="Ex: Next.js, Django, FastAPI, Laravel, Rust..."
                    list="custom-tech-options"
                    className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-xs sm:text-sm text-palabre-text focus:outline-none focus:ring-1 ${
                      errors.technology ? 'border-red-500 focus:ring-red-500' : 'border-palabre-border focus:ring-palabre-primary'
                    }`}
                    required
                  />
                  <datalist id="custom-tech-options">
                    {availableTechnologies.map((tech) => (
                      <option key={tech} value={tech} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <select
                  value={technology}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomTech(true);
                      setTechnology('');
                    } else {
                      setTechnology(e.target.value);
                    }
                  }}
                  className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-xs sm:text-sm text-palabre-text focus:outline-none focus:ring-1 ${
                    errors.technology ? 'border-red-500 focus:ring-red-500' : 'border-palabre-border focus:ring-palabre-primary'
                  }`}
                  required
                >
                  <option value="">Sélectionner</option>
                  {availableTechnologies.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                  <option value="__custom__">+ Autre technologie (saisie libre)...</option>
                </select>
              )}
              {errors.technology && <p className="text-red-600 text-xs mt-1">{errors.technology}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Langage
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Ex: TypeScript, Python, Dart"
                className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-xs sm:text-sm text-palabre-text focus:outline-none focus:ring-1 focus:ring-palabre-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Framework / Bibliothèque
              </label>
              <input
                type="text"
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                placeholder="Ex: Next.js, FastAPI, Flutter"
                className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-xs sm:text-sm text-palabre-text focus:outline-none focus:ring-1 focus:ring-palabre-primary"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Description détaillée du problème *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Expliquez ce que vous essayez d'accomplir, ce qui ne fonctionne pas et les étapes menant au bug..."
              className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm text-palabre-text focus:outline-none focus:ring-1 ${
                errors.description ? 'border-red-500 focus:ring-red-500' : 'border-palabre-border focus:ring-palabre-primary'
              }`}
              required
            />
            {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Message d'erreur */}
          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Message d'erreur exact (console, terminal ou API)
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="Ex: Error: Signature verification failed for wave webhook signature token..."
                className="w-full px-3 py-2 bg-[#0F1715] text-red-300 font-mono text-xs border border-[#1C2C26] rounded-btn focus:outline-none focus:ring-1 focus:ring-palabre-primary"
              />
            </div>
          </div>

          {/* Résultat attendu */}
          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Résultat attendu
            </label>
            <input
              type="text"
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="Ex: Le webhook devrait valider la signature et mettre à jour le statut de commande en base de données"
              className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-xs sm:text-sm text-palabre-text focus:outline-none focus:ring-1 focus:ring-palabre-primary"
            />
          </div>

          {/* Outils & Environnement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Version des outils / dépendances
              </label>
              <input
                type="text"
                value={toolsVersion}
                onChange={(e) => setToolsVersion(e.target.value)}
                placeholder="Ex: Node v20.11, express 4.18.2"
                className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-xs sm:text-sm text-palabre-text focus:outline-none focus:ring-1 focus:ring-palabre-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Environnement d'exécution / OS
              </label>
              <input
                type="text"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="Ex: Ubuntu 22.04 LTS, Docker, VPS OVH"
                className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-xs sm:text-sm text-palabre-text focus:outline-none focus:ring-1 focus:ring-palabre-primary"
              />
            </div>
          </div>

          {/* Bloc de code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-palabre-text">
                Extrait de code problématique
              </label>
              <select
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
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
              rows={6}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="// Collez ici l'extrait de code minimal qui déclenche le comportement..."
              className="w-full p-3 bg-palabre-codeBg text-palabre-codeText font-mono text-xs rounded-btn border border-palabre-border leading-relaxed focus:outline-none focus:ring-1 focus:ring-palabre-primary"
            />
          </div>

          {/* Captures d'écran (Supabase Storage) */}
          <div className="space-y-2 pt-2 border-t border-palabre-border/60">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-palabre-text">
                  Captures d'écran (max 5 Mo, PNG / JPEG / WebP / GIF)
                </label>
                <p className="text-[11px] text-palabre-muted">
                  Illustrez le message d'erreur ou l'interface sans révéler de données sensibles.
                </p>
              </div>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-palabre-bg hover:bg-slate-100 border border-palabre-border rounded-btn text-xs font-semibold text-palabre-text cursor-pointer transition-colors shadow-2xs">
                <Upload size={14} />
                <span>{isUploading ? 'Envoi...' : 'Ajouter une capture'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {attachments.map((url, idx) => (
                  <div key={idx} className="relative group aspect-video rounded-btn overflow-hidden border border-palabre-border bg-slate-100">
                    <img src={url} alt={`Capture ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                      title="Retirer cette capture"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-palabre-border">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting}
              className="px-4 py-2 border border-palabre-border rounded-btn text-xs font-semibold text-palabre-text hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Enregistrer en brouillon
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPreview(true)}
                className="px-4 py-2 border border-palabre-border rounded-btn text-xs font-semibold text-palabre-text hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Aperçu
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-palabre-primary hover:bg-[#0c4a3b] text-white rounded-btn text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {isSubmitting ? 'Publication...' : isEditing ? 'Mettre à jour' : 'Publier le problème'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
