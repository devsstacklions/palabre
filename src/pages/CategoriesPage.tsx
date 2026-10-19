import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVICES, PAYS } from '../lib/constants';
import { ficheService } from '../services/fiche.service';
import { Fiche } from '../types';
import { Smartphone, Hash, MessageSquare, Server, Globe2, Radio } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    ficheService.getFiches().then(setFiches).catch(() => {});
  }, []);

  const getServiceCount = (service: string) =>
    fiches.filter((f) => f.operator_service.toLowerCase() === service.toLowerCase()).length;

  const getCountryCount = (country: string) =>
    fiches.filter((f) => f.country.toLowerCase() === country.toLowerCase()).length;

  const getServiceIcon = (service: string) => {
    const s = service.toLowerCase();
    if (s.includes('wave') || s.includes('money') || s.includes('momo')) return <Smartphone size={20} />;
    if (s.includes('sms')) return <MessageSquare size={20} />;
    if (s.includes('ussd')) return <Hash size={20} />;
    if (s.includes('hébergement') || s.includes('cloud')) return <Server size={20} />;
    return <Radio size={20} />;
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-palabre-text tracking-tight mb-2">
          Catégories et pays
        </h1>
        <p className="text-sm text-palabre-muted">
          Explorez les solutions techniques documentées par opérateur, passerelle ou couverture géographique.
        </p>
      </div>

      {/* Services & Opérateurs */}
      <div>
        <h2 className="text-lg font-bold text-palabre-text mb-3">Opérateurs & Passerelles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {SERVICES.map((s) => {
            const count = getServiceCount(s);
            return (
              <button
                key={s}
                onClick={() => navigate(`/search?service=${encodeURIComponent(s)}`)}
                className="bg-white border border-palabre-border hover:border-palabre-primary rounded-card p-4 text-left transition-all hover:shadow-sm flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-palabre-primaryLight text-palabre-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getServiceIcon(s)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-palabre-text group-hover:text-palabre-primary transition-colors">
                      {s}
                    </h3>
                    <span className="text-xs text-palabre-muted">
                      {count} solution{count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pays */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe2 size={18} className="text-palabre-primary" />
          <h2 className="text-lg font-bold text-palabre-text">Couverture par pays</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {PAYS.map((p) => {
            const count = getCountryCount(p);
            return (
              <button
                key={p}
                onClick={() => navigate(`/search?country=${encodeURIComponent(p)}`)}
                className="px-4 py-2 bg-white border border-palabre-border hover:border-palabre-primary rounded-full text-xs sm:text-sm font-medium text-palabre-text hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>{p}</span>
                {count > 0 && (
                  <span className="px-1.5 py-0.2 bg-palabre-bg border border-palabre-border text-xs rounded-full font-bold text-palabre-primary">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-palabre-muted leading-relaxed">
          Palabre a vocation à s'étendre à l'ensemble du continent africain. Les pays listés ci-dessus représentent les premières implémentations prioritaires pour le CADev 2026.
        </p>
      </div>
    </div>
  );
};

