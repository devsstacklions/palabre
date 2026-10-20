import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ficheService } from '../services/fiche.service';
import { FicheCard } from '../components/fiches/FicheCard';
import { SearchBar } from '../components/fiches/SearchBar';
import { Fiche } from '../types';
import { PlusCircle, Bookmark, CheckCircle2, Clock } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [toVerifyFiches, setToVerifyFiches] = useState<Fiche[]>([]);
  const [confirmedFiches, setConfirmedFiches] = useState<Fiche[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const allFiches = await ficheService.getFiches();
        // Fiches à revérifier ou récentes peu vérifiées
        const toVerify = allFiches.filter((f) => f.verification_status === 're' || f.verification_status === 'new');
        // Récemment confirmées
        const confirmed = allFiches.filter((f) => f.verification_status === 'ok');

        setToVerifyFiches(toVerify.slice(0, 4));
        setConfirmedFiches(confirmed.slice(0, 4));
      } catch (err) {
        console.error('Erreur chargement tableau de bord:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Développeur';

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-palabre-text tracking-tight mb-2">
          Bonjour {displayName}
        </h1>
        <p className="text-xs sm:text-sm text-palabre-muted">
          Retrouvez les fiches à tester dans votre environnement et les solutions récemment confirmées.
        </p>
      </div>

      <SearchBar />

      {/* Raccourcis rapides */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/fiches/new"
          className="px-4 py-2 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-xs sm:text-sm font-semibold transition-colors shadow-xs flex items-center gap-2"
        >
          <PlusCircle size={16} />
          <span>Publier une fiche</span>
        </Link>
        <Link
          to="/profile?tab=fav"
          className="px-4 py-2 bg-white border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <Bookmark size={15} />
          <span>Mes favoris</span>
        </Link>
      </div>

      {/* À vérifier */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-palabre-text flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              <span>À vérifier dans votre contexte</span>
            </h2>
            <p className="text-xs text-palabre-muted">
              Ces fiches ont besoin d'une confirmation récente pour certifier leur fonctionnement.
            </p>
          </div>
          <Link
            to="/search?status=re"
            className="text-xs font-semibold text-palabre-primary hover:underline"
          >
            Voir tout
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-palabre-border rounded-card p-4 h-44 animate-pulse" />
            ))}
          </div>
        ) : toVerifyFiches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toVerifyFiches.map((fiche) => (
              <FicheCard key={fiche.id} fiche={fiche} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-palabre-border rounded-card p-6 text-center text-xs text-palabre-muted">
            Toutes les fiches actuelles bénéficient de validations récentes.
          </div>
        )}
      </section>

      {/* Récemment confirmées */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-palabre-text flex items-center gap-2">
              <CheckCircle2 size={18} className="text-palabre-ok" />
              <span>Récemment confirmées</span>
            </h2>
            <p className="text-xs text-palabre-muted">
              Solutions validées par plusieurs membres de la communauté avec succès.
            </p>
          </div>
          <Link
            to="/search?status=ok"
            className="text-xs font-semibold text-palabre-primary hover:underline"
          >
            Voir tout
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-palabre-border rounded-card p-4 h-44 animate-pulse" />
            ))}
          </div>
        ) : confirmedFiches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {confirmedFiches.map((fiche) => (
              <FicheCard key={fiche.id} fiche={fiche} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-palabre-border rounded-card p-6 text-center text-xs text-palabre-muted">
            Aucune fiche confirmée pour l'instant.
          </div>
        )}
      </section>
    </div>
  );
};

