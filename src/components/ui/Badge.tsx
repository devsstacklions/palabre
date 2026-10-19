import React from 'react';
import { VerificationStatus } from '../../types';
import { VERIFICATION_STATUS_CONFIG } from '../../lib/constants';
import { CheckCircle2, Clock, AlertTriangle, Sparkles } from 'lucide-react';

interface BadgeProps {
  status: VerificationStatus;
  className?: string;
  showIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '', showIcon = true }) => {
  const config = VERIFICATION_STATUS_CONFIG[status] || VERIFICATION_STATUS_CONFIG.new;

  const renderIcon = () => {
    if (!showIcon) return null;
    const iconSize = 14;
    switch (status) {
      case 'ok':
        return <CheckCircle2 size={iconSize} className="mr-1 stroke-[2.5]" />;
      case 're':
        return <Clock size={iconSize} className="mr-1 stroke-[2.5]" />;
      case 'fl':
        return <AlertTriangle size={iconSize} className="mr-1 stroke-[2.5]" />;
      case 'new':
      default:
        return <Sparkles size={iconSize} className="mr-1 stroke-[2.5]" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass} ${className}`}
      title={config.description}
    >
      {renderIcon()}
      {config.label}
    </span>
  );
};

