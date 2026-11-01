import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Fiche } from '../../types';
import { Badge } from '../ui/Badge';
import { formatRelativeDate } from '../../lib/utils';
import { CheckCircle2, Bookmark, Eye, MessageSquare, AlertTriangle } from 'lucide-react';

interface FicheCardProps {
  fiche: Fiche;
  isFavorite?: boolean;
  onToggleFavorite?: (ficheId: string) => void;
}

export const FicheCard: React.FC<FicheCardProps> = ({
  fiche,
  isFavorite,
  onToggleFavorite,
}) => {
  const navigate = useNavigate();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/fiches/${fiche.id}`);
    }
  };

  const authorName = fiche.author?.display_name || 'Contributeur';

  return (
    <article
      tabIndex={0}
      role="link"
      onClick={() => navigate(`/fiches/${fiche.id}`)}
      onKeyDown={handleKeyDown}
      className="bg-white border border-palabre-border rounded-card p-4 transition-all duration-200 hover:border-palabre-primary hover:shadow-md cursor-pointer flex flex-col justify-between focus-visible:outline-3 focus-visible:outline-palabre-accent focus-visible:outline-offset-2 relative group"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge status={fiche.verification_status} />
            <span className="text-xs text-palabre-muted flex items-center gap-1 font-medium" title="Confirmations positives">
              <CheckCircle2 size={13} className="text-palabre-ok" />
              {fiche.confirmations_count} confirmation{fiche.confirmations_count > 1 ? 's' : ''}
            </span>
            {Boolean(fiche.negative_feedback_count && fiche.negative_feedback_count > 0) && (
              <span className="text-xs text-red-600 flex items-center gap-1 font-medium" title="Signalements ou échecs signalés">
                <AlertTriangle size={12} />
                {fiche.negative_feedback_count} contesté{fiche.negative_feedback_count > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(fiche.id);
              }}
              className={`p-1.5 rounded-full transition-colors ${
                isFavorite
                  ? 'text-palabre-accent bg-amber-50 hover:bg-amber-100'
                  : 'text-palabre-muted hover:text-palabre-text hover:bg-palabre-bg'
              }`}
              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Bookmark size={16} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        <h3 className="font-semibold text-base text-palabre-text group-hover:text-palabre-primary transition-colors line-clamp-2 mb-1.5">
          {fiche.title}
        </h3>

        <p className="text-sm text-palabre-muted line-clamp-2 mb-3">
          {fiche.short_description || fiche.problem}
        </p>

        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <span className="text-xs bg-palabre-bg border border-palabre-border px-2.5 py-0.5 rounded-full text-palabre-text font-medium">
            {fiche.country}
          </span>
          <span className="text-xs bg-palabre-bg border border-palabre-border px-2.5 py-0.5 rounded-full text-palabre-text font-medium">
            {fiche.operator_service}
          </span>
          <span className="text-xs bg-palabre-bg border border-palabre-border px-2.5 py-0.5 rounded-full text-palabre-text font-medium">
            {fiche.language}
          </span>
          {fiche.api_version && (
            <span className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-600 font-mono">
              {fiche.api_version}
            </span>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-palabre-muted">
        <div className="flex items-center gap-3">
          <span>
            {formatRelativeDate(fiche.last_validated_at || fiche.created_at)}
          </span>
          <span className="flex items-center gap-1" title={`${fiche.views_count || 0} consultations`}>
            <Eye size={12} className="text-slate-400" />
            <span>{fiche.views_count || 0}</span>
          </span>
          <span className="flex items-center gap-1" title={`${fiche.comments_count || 0} commentaires`}>
            <MessageSquare size={12} className="text-slate-400" />
            <span>{fiche.comments_count || 0}</span>
          </span>
        </div>
        <span className="font-medium text-slate-700 truncate max-w-[120px]" title={authorName}>
          {authorName}
        </span>
      </div>
    </article>
  );
};

