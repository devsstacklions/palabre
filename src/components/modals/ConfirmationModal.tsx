import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { confirmationSchema, ConfirmationFormData } from '../../schemas/interaction.schema';
import { PAYS, SERVICES } from '../../lib/constants';
import { FicheConfirmation } from '../../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ConfirmationFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  defaultCountry?: string;
  defaultOperator?: string;
  ficheTitle?: string;
  existingConfirmation?: FicheConfirmation | null;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  defaultCountry = '',
  defaultOperator = '',
  ficheTitle = '',
  existingConfirmation = null,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ConfirmationFormData>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: {
      country: defaultCountry,
      operator_service: defaultOperator,
      tested_version: '',
      test_context: '',
      comment: '',
      is_working: true,
    },
  });

  const isWorking = watch('is_working');

  useEffect(() => {
    if (existingConfirmation) {
      reset({
        country: existingConfirmation.country || defaultCountry,
        operator_service: existingConfirmation.operator_service || defaultOperator,
        tested_version: existingConfirmation.tested_version || '',
        test_context: existingConfirmation.test_context || '',
        comment: existingConfirmation.comment || '',
        is_working: existingConfirmation.is_working,
      });
    } else {
      reset({
        country: defaultCountry,
        operator_service: defaultOperator,
        tested_version: '',
        test_context: '',
        comment: '',
        is_working: true,
      });
    }
  }, [existingConfirmation, defaultCountry, defaultOperator, reset, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: ConfirmationFormData) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’enregistrement de votre retour de test');
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm('Voulez-vous retirer votre retour de test sur cette fiche ?')) return;
    try {
      await onDelete();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du retrait de votre confirmation');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-card max-w-lg w-full p-6 shadow-xl border border-palabre-border relative overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-palabre-muted hover:text-palabre-text rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1 text-palabre-primary font-semibold">
          <CheckCircle2 size={20} />
          <h2 className="text-xl font-bold text-palabre-text">
            {existingConfirmation ? 'Modifier mon retour de test' : 'Tester et certifier cette solution'}
          </h2>
        </div>
        <p className="text-xs text-palabre-muted mb-4 line-clamp-1">
          Fiche : <span className="font-medium text-slate-700">{ficheTitle}</span>
        </p>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Choix du résultat */}
          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1.5">
              Résultat de votre test dans votre contexte *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setValue('is_working', true)}
                className={`py-2 px-3 rounded-btn border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isWorking
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                    : 'bg-white border-palabre-border text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 size={15} className={isWorking ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Ça marche chez moi</span>
              </button>

              <button
                type="button"
                onClick={() => setValue('is_working', false)}
                className={`py-2 px-3 rounded-btn border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  !isWorking
                    ? 'bg-red-50 border-red-400 text-red-800 shadow-xs'
                    : 'bg-white border-palabre-border text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle size={15} className={!isWorking ? 'text-red-600' : 'text-slate-400'} />
                <span>Ne fonctionne pas / Obsolète</span>
              </button>
            </div>
            <p className="text-[11px] text-palabre-muted mt-1">
              {isWorking
                ? 'Contribue à la certification communautaire de la fiche (seuil requis : 3 confirmations).'
                : 'Signale un échec ou une obsolescence pour réexaminer la validité de la fiche.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Pays de test *
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
              Version de l'API / SDK testée
            </label>
            <input
              type="text"
              placeholder="Ex. : v2.1.0, sandbox Wave v1"
              {...register('tested_version')}
              className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Contexte de votre test
            </label>
            <input
              type="text"
              placeholder="Ex. : Express.js avec hébergement VPS, connexion 4G Orange"
              {...register('test_context')}
              className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Remarque ou précision utile
            </label>
            <textarea
              rows={3}
              placeholder="Ex. : Fonctionne parfaitement en production après avoir ajouté le header User-Agent requis."
              {...register('comment')}
              className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {existingConfirmation && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Retirer mon avis</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-palabre-border text-palabre-text rounded-btn text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting
                  ? 'Enregistrement...'
                  : existingConfirmation
                  ? 'Mettre à jour'
                  : 'Enregistrer mon avis'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
