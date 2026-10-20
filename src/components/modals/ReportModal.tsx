import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, AlertTriangle } from 'lucide-react';
import { reportSchema, ReportFormData } from '../../schemas/interaction.schema';
import { REPORT_REASONS } from '../../lib/constants';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReportFormData) => Promise<void>;
  ficheTitle?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
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
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
  });

  if (!isOpen) return null;

  const handleFormSubmit = async (data: ReportFormData) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’envoi du signalement');
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

        <div className="flex items-center gap-2 mb-1 text-palabre-fl font-semibold">
          <AlertTriangle size={20} />
          <h2 className="text-xl font-bold text-palabre-text">Signaler un problème</h2>
        </div>
        <p className="text-xs text-palabre-muted mb-4 line-clamp-1">
          Fiche concernée : <span className="font-medium text-slate-700">{ficheTitle}</span>
        </p>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Motif du signalement *
            </label>
            <select
              {...register('reason')}
              className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                errors.reason ? 'border-red-500' : 'border-palabre-border'
              }`}
            >
              <option value="">Sélectionnez un motif</option>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors.reason && (
              <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-palabre-text mb-1">
              Description détaillée *
            </label>
            <textarea
              rows={4}
              placeholder="Expliquez ce qui ne fonctionne pas, le message d'erreur ou le risque de sécurité observé..."
              {...register('description')}
              className={`w-full px-3 py-2 bg-palabre-bg border rounded-btn text-sm ${
                errors.description ? 'border-red-500' : 'border-palabre-border'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-btn text-xs text-amber-800">
            <strong>Rappel bienveillant :</strong> Les signalements aident à maintenir la fiabilité de Palabre. Les modérateurs et l'auteur seront notifiés pour examiner et corriger la fiche.
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
              className="px-5 py-2 bg-palabre-fl hover:bg-red-700 text-white rounded-btn text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer le signalement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

