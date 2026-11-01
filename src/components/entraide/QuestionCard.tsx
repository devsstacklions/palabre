import React from 'react';
import { Link } from 'react-router-dom';
import { Question } from '../../types';
import { QuestionStatusBadge } from './QuestionStatusBadge';
import { formatRelativeDate } from '../../lib/utils';
import { MessageSquare, Eye, Image as ImageIcon, Terminal, CheckCircle2 } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const authorName = question.author?.display_name || question.author?.username || 'Développeur';

  return (
    <article className="bg-white border border-palabre-border rounded-card p-5 hover:border-palabre-primary/40 hover:shadow-sm transition-all duration-200">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <QuestionStatusBadge status={question.status} />

        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-palabre-bg border border-palabre-border text-palabre-text">
          {question.technology}
        </span>

        {question.framework && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700">
            {question.framework}
          </span>
        )}

        {question.status === 'resolved' && (
          <span className="inline-flex items-center text-xs font-semibold text-emerald-700 gap-1 ml-auto">
            <CheckCircle2 size={13} />
            Solution trouvée
          </span>
        )}
      </div>

      <h2 className="text-base sm:text-lg font-bold text-palabre-text mb-2 leading-snug">
        <Link
          to={`/entraide/${question.id}`}
          className="hover:text-palabre-primary transition-colors line-clamp-2"
        >
          {question.title}
        </Link>
      </h2>

      <p className="text-xs text-palabre-muted line-clamp-2 leading-relaxed mb-3">
        {question.description}
      </p>

      {/* Aperçu du message d'erreur si présent */}
      {question.error_message && (
        <div className="mb-3 px-3 py-1.5 bg-[#0F1715] text-[#9DB0A8] rounded-md font-mono text-[11px] flex items-center gap-2 overflow-hidden border border-[#1C2C26]">
          <Terminal size={12} className="text-amber-400 shrink-0" />
          <span className="truncate text-red-300">{question.error_message}</span>
        </div>
      )}

      {/* Pied de carte avec auteur et statistiques */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-palabre-border/60 text-xs text-palabre-muted">
        <div className="flex items-center gap-2">
          <span className="font-medium text-palabre-text">{authorName}</span>
          <span>·</span>
          <span>{formatRelativeDate(question.created_at)}</span>
        </div>

        <div className="flex items-center gap-3 font-medium">
          {question.attachments && question.attachments.length > 0 && (
            <span
              className="flex items-center gap-1 text-slate-500"
              title={`${question.attachments.length} capture(s) d'écran`}
            >
              <ImageIcon size={13} />
              <span>{question.attachments.length}</span>
            </span>
          )}

          <span
            className={`flex items-center gap-1 ${
              question.answers_count > 0 ? 'text-palabre-primary font-semibold' : 'text-slate-400'
            }`}
          >
            <MessageSquare size={13} />
            <span>{question.answers_count} rép.</span>
          </span>

          <span className="flex items-center gap-1 text-slate-400">
            <Eye size={13} />
            <span>{question.views_count}</span>
          </span>
        </div>
      </div>
    </article>
  );
};
