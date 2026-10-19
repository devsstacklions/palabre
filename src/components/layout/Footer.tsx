import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-palabre-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="#0F5C4A" />
                <path d="M7 9h18v11H15l-5 4v-4H7z" fill="#FFFFFF" />
                <path
                  d="M13 12.5l-2.5 2 2.5 2M19 12.5l2.5 2-2.5 2"
                  stroke="#0F5C4A"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              <span className="font-bold text-palabre-text text-base">Palabre</span>
            </div>
            <p className="text-palabre-muted text-xs leading-relaxed max-w-sm mb-3">
              Plateforme collaborative de partage de fiches techniques adaptées aux réalités des développeurs africains : paiements mobiles, SMS, USSD, contraintes réseau et versions locales.
            </p>
            <p className="text-xs text-palabre-primary font-medium">
              Coupe d'Afrique des Développeurs (CADev) 2026
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-palabre-text text-xs uppercase tracking-wider mb-2.5">
              Plateforme
            </h4>
            <ul className="space-y-1.5 text-xs text-palabre-muted">
              <li>
                <Link to="/search" className="hover:text-palabre-primary transition-colors">
                  Explorer les solutions
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-palabre-primary transition-colors">
                  Catégories & Services
                </Link>
              </li>
              <li>
                <Link to="/fiches/new" className="hover:text-palabre-primary transition-colors">
                  Partager une fiche
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-palabre-primary transition-colors">
                  Guide de contribution
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-palabre-text text-xs uppercase tracking-wider mb-2.5">
              Sécurité & Éthique
            </h4>
            <ul className="space-y-1.5 text-xs text-palabre-muted">
              <li>
                <span className="text-slate-600">Jamais de clés ni secrets réels</span>
              </li>
              <li>
                <span className="text-slate-600">Vérification contextuelle honnête</span>
              </li>
              <li>
                <span className="text-slate-600">Signalement collaboratif</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-palabre-muted">
          <span>&copy; {new Date().getFullYear()} Palabre · Développé pour la CADev 2026.</span>
          <span>Pour les devs, par les devs.</span>
        </div>
      </div>
    </footer>
  );
};

