import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SearchBar } from '../components/fiches/SearchBar';
import { FicheCard } from '../components/fiches/FicheCard';
import { ficheService } from '../services/fiche.service';
import { favoriteService } from '../services/favorite.service';
import { useAuth } from '../contexts/AuthContext';
import { Fiche, SearchFilters, VerificationStatus } from '../types';
import { PAYS, SERVICES, TECHNOLOGIES, VERIFICATION_STATUS_CONFIG } from '../../src/lib/constants';
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const countryParam = searchParams.get('country') || '';
  const serviceParam = searchParams.get('service') || '';
  const techParam = searchParams.get('tech') || '';
  const statusParam = searchParams.get('status') || '';
  const sortParam = (searchParams.get('sort') as 'recent' | 'confirmations' | 'relevance') || 'recent';

  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadFiches = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: SearchFilters = {
        query: queryParam,
        country: countryParam || undefined,
        operator: serviceParam || undefined,
        technology: techParam || undefined,
        status: statusParam || undefined,
        sortBy: sortParam,
      };

      const results = await ficheService.getFiches(filters);
      setFiches(results);

      if (user) {
        const userFavs = await favoriteService.getUserFavorites(user.id);
        setFavoriteIds(new Set(userFavs.map((f) => f.id)));
      }
    } catch (err) {
      console.error('Erreur chargement fiches:', err);
    } finally {
      setIsLoading(false);
    }
  }, [queryParam, countryParam, serviceParam, techParam, statusParam, sortParam, user]);

  useEffect(() => {
    loadFiches();
  }, [loadFiches]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleToggleFavorite = async (ficheId: string) => {
    if (!user) return;
    try {
      if (favoriteIds.has(ficheId)) {
        await favoriteService.removeFavorite(ficheId, user.id);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(ficheId);
          return next;
        });
      } else {
        await favoriteService.addFavorite(ficheId, user.id);
        setFavoriteIds((prev) => new Set(prev).add(ficheId));
      }
    } catch (err) {
      console.error('Erreur favoris:', err);
    }
  };

  const hasActiveFilters = Boolean(
    queryParam || countryParam || serviceParam || techParam || statusParam
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-palabre-text tracking-tight mb-2">
          Explorer les solutions
        </h1>
        <p className="text-sm text-palabre-muted">
          Recherchez parmi les fiches de terrain testées par les développeurs en Afrique.
        </p>
      </div>

      <SearchBar
        initialValue={queryParam}
        onSearch={(q) => updateFilter('q', q)}
        className="my-0"
      />

      {/* Filtres 4 colonnes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div>
          <select
            value={countryParam}
            onChange={(e) => updateFilter('country', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-palabre-border rounded-btn text-xs sm:text-sm font-medium text-palabre-text"
            aria-label="Filtrer par pays"
          >
            <option value="">Tous les pays</option>
            {PAYS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={serviceParam}
            onChange={(e) => updateFilter('service', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-palabre-border rounded-btn text-xs sm:text-sm font-medium text-palabre-text"
            aria-label="Filtrer par service ou opérateur"
          >
            <option value="">Tous les services</option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={techParam}
            onChange={(e) => updateFilter('tech', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-palabre-border rounded-btn text-xs sm:text-sm font-medium text-palabre-text"
            aria-label="Filtrer par technologie"
          >
            <option value="">Toutes technologies</option>
            {TECHNOLOGIES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusParam}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-palabre-border rounded-btn text-xs sm:text-sm font-medium text-palabre-text"
            aria-label="Filtrer par statut de vérification"
          >
            <option value="">Tous statuts</option>
            {Object.entries(VERIFICATION_STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Barre d'état des filtres et tri */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              <RotateCcw size={12} />
              <span>Réinitialiser</span>
            </button>
          )}

          {countryParam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-palabre-border text-xs text-palabre-text font-medium">
              Pays: {countryParam}
              <button onClick={() => updateFilter('country', '')}>
                <X size={12} className="text-palabre-muted hover:text-red-500" />
              </button>
            </span>
          )}

          {serviceParam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-palabre-border text-xs text-palabre-text font-medium">
              Service: {serviceParam}
              <button onClick={() => updateFilter('service', '')}>
                <X size={12} className="text-palabre-muted hover:text-red-500" />
              </button>
            </span>
          )}

          {techParam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-palabre-border text-xs text-palabre-text font-medium">
              Tech: {techParam}
              <button onClick={() => updateFilter('tech', '')}>
                <X size={12} className="text-palabre-muted hover:text-red-500" />
              </button>
            </span>
          )}

          {statusParam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-palabre-border text-xs text-palabre-text font-medium">
              Statut: {VERIFICATION_STATUS_CONFIG[statusParam as VerificationStatus]?.label || statusParam}
              <button onClick={() => updateFilter('status', '')}>
                <X size={12} className="text-palabre-muted hover:text-red-500" />
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-palabre-muted font-medium">
            {isLoading ? 'Chargement...' : `${fiches.length} résultat${fiches.length > 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-1 text-xs">
            <SlidersHorizontal size={13} className="text-palabre-muted" />
            <select
              value={sortParam}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="bg-transparent text-palabre-text font-semibold focus:outline-none cursor-pointer py-1"
            >
              <option value="recent">Plus récentes</option>
              <option value="confirmations">Plus confirmées</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grille de résultats */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-palabre-border rounded-card p-4 h-48 animate-pulse" />
          ))}
        </div>
      ) : fiches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fiches.map((fiche) => (
            <FicheCard
              key={fiche.id}
              fiche={fiche}
              isFavorite={favoriteIds.has(fiche.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-palabre-border rounded-card p-10 text-center max-w-lg mx-auto">
          <h2 className="text-lg font-bold text-palabre-text mb-2">Aucune solution trouvée</h2>
          <p className="text-xs sm:text-sm text-palabre-muted leading-relaxed mb-6">
            Essayez de retirer un filtre, de chercher un nom d'opérateur plutôt qu'un message d'erreur, ou d'élargir à un autre pays.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs font-semibold"
            >
              Réinitialiser les filtres
            </button>
            <Link
              to="/fiches/new"
              className="px-4 py-2 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-xs font-semibold"
            >
              Publier une nouvelle fiche
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

