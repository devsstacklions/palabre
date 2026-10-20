import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, GitFork } from 'lucide-react';
import { variantSchema, VariantFormData } from '../../schemas/interaction.schema';
import { PAYS, SERVICES } from '../../lib/constants';

interface VariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VariantFormData) => Promise<void>;
  ficheTitle?: string;
}

export const VariantModal: React.FC<VariantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ficheTitle = '',
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<VariantFormData>({
    resolver: zodResolver(variantSchema),
  });

  if (!isOpen) return null;

  const handleFormSubmit = async (data: VariantFormData) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’ajout de la variante');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-card max-w-lg w-full p-6 shadow-xl border border-palabre-border relative overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-palabre-muted hover:text-palabre-text rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1 text-palabre-primary font-semibold">
          <GitFork size={20} />
          <h2 className="text-xl font-bold text-palabre-text">Proposer une variante</h2>
        </div>
        <p className="text-xs text-palabre-muted mb-4 line-clamp-1">
          Variante contextuelle pour : <span className="font-medium text-slate-700">{ficheTitle}</span>
        </p>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Titre de la variante *
            </label>
            <input
              type="text"
              placeholder="Ex. : Adaptation pour Orange Money Côte d'Ivoire (v2)"
              {...register('title')}
              className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                errors.title ? 'border-red-500' : 'border-palabre-border'
              }`}
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Pays concerné *
              </label>
              <select
                {...register('country')}
                className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                  errors.country ? 'border-red-500' : 'border-palabre-border'
                }`}
              >
                <option value="">Sélectionner</option>
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
                className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                  errors.operator_service ? 'border-red-500' : 'border-palabre-border'
                }`}
              >
                <option value="">Sélectionner</option>
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Différences et adaptations requises *
            </label>
            <textarea
              rows={3}
              placeholder="Décrivez les champs différents, la méthode d'authentification ou les spécificités propres à cet opérateur/pays..."
              {...register('differences')}
              className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                errors.differences ? 'border-red-500' : 'border-palabre-border'
              }`}
            />
            {errors.differences && (
              <p className="text-xs text-red-500 mt-1">{errors.differences.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Extrait de code adapté (facultatif)
            </label>
            <textarea
              rows={4}
              placeholder="// Code spécifique à cette variante..."
              {...register('code_snippet')}
              className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-sm font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-palabre-border text-palabre-text rounded-btn text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Publication...' : 'Publier la variante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

