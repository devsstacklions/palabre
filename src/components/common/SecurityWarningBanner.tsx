import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface SecurityWarningBannerProps {
  className?: string;
}

export const SecurityWarningBanner: React.FC<SecurityWarningBannerProps> = ({ className = '' }) => {
  return (
    <div
      className={`p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-card text-xs text-amber-900 flex items-start gap-2.5 ${className}`}
      role="alert"
    >
      <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-amber-950 mb-0.5">Règle de sécurité et confidentialité</p>
        <p className="text-amber-800 leading-relaxed">
          Ne partagez jamais de clés API secrètes (Wave, Orange Money, etc.), mots de passe, tokens JWT,
          ou données personnelles dans vos descriptions, extraits de code ou captures d'écran.
          Le code partagé sur Palabre est destiné à être lu par des développeurs et n'est jamais exécuté automatiquement.
        </p>
      </div>
    </div>
  );
};
