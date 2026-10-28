import React from 'react';
import { QuestionStatus } from '../../types';
import { CheckCircle2, Clock, HelpCircle, FileText, Lock } from 'lucide-react';

interface QuestionStatusBadgeProps {
  status: QuestionStatus;
  className?: string;
  showIcon?: boolean;
}

export const QuestionStatusBadge: React.FC<QuestionStatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'resolved':
        return {
          label: 'Résolu',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 size={13} className="mr-1 stroke-[2.5] text-emerald-600" />,
        };
      case 'in_progress':
        return {
          label: 'En cours',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: <Clock size={13} className="mr-1 stroke-[2.5] text-amber-600" />,
        };
      case 'draft':
        return {
          label: 'Brouillon',
          badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: <FileText size={13} className="mr-1 text-gray-500" />,
        };
      case 'closed':
        return {
          label: 'Fermé',
          badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
          icon: <Lock size={13} className="mr-1 text-slate-500" />,
        };
      case 'open':
      default:
        return {
          label: 'Ouvert',
          badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
          icon: <HelpCircle size={13} className="mr-1 stroke-[2.5] text-sky-600" />,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass} ${className}`}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};
