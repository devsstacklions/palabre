import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchBar } from '../components/fiches/SearchBar';
import { FicheCard } from '../components/fiches/FicheCard';
import { Badge } from '../components/ui/Badge';
import { ficheService } from '../services/fiche.service';
import { favoriteService } from '../services/favorite.service';
import { useAuth } from '../contexts/AuthContext';
import { Fiche } from '../types';
import { Search, Code2, CheckCircle2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [recentFiches, setRecentFiches] = useState<Fiche[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const fiches = await ficheService.getFiches({ sortBy: 'recent' });
        if (isMounted) {
          setRecentFiches(fiches.slice(0, 6));
        }

        if (user && isMounted) {
          const userFavs = await favoriteService.getUserFavorites(user.id);
          if (isMounted) {
            setFavoriteIds(new Set(userFavs.map((f) => f.id)));
          }
        }
      } catch (err) {
        console.error('Erreur chargement page d’accueil:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleToggleFavorite = async (ficheId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
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

  return (
    <div className="space-y-12 pb-12">
      {/* Hero section */}
      <section className="pt-8 pb-4 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-palabre-primaryLight text-palabre-primary text-xs font-semibold mb-4 border border-emerald-200">
          <Sparkles size={13} />
          <span>CADev 2026 · Par les devs, pour les devs</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-palabre-text tracking-tight leading-tight mb-3">
          La bonne solution, <br className="hidden sm:inline" />
          <span className="text-palabre-primary">testée chez vous.</span>
        </h1>
        <p className="text-base sm:text-lg text-palabre-muted leading-relaxed mb-6">
          Palabre rassemble des fiches techniques contextualisées pour l'Afrique : Mobile Money (Wave, Orange, MTN), SMS, USSD, contraintes réseau et passerelles locales, datées et confirmées par la communauté.
        </p>

        <SearchBar />

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Link
            to="/search"
            className="px-5 py-2.5 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn font-semibold text-sm transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <span>Explorer les solutions</span>
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/fiches/new"
            className="px-5 py-2.5 bg-white border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn font-semibold text-sm transition-colors shadow-xs"
          >
            Partager une solution
          </Link>
        </div>
      </section>

      {/* Comment ça marche */}
      <section>
        <h2 className="text-xl font-bold text-palabre-text mb-4">Comment ça marche</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-palabre-border rounded-card p-5 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-palabre-primaryLight text-palabre-primary flex items-center justify-center font-bold mb-3">
              <Search size={18} />
            </div>
            <h3 className="font-semibold text-base text-palabre-text mb-1">1. Cherchez</h3>
            <p className="text-xs text-palabre-muted leading-relaxed">
              Filtrez par pays, opérateur (Wave, Orange Money, MoMo) et technologie pour trouver la solution adaptée à votre contexte réel.
            </p>
          </div>

          <div className="bg-white border border-palabre-border rounded-card p-5 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-palabre-accent flex items-center justify-center font-bold mb-3">
              <Code2 size={18} />
            </div>
            <h3 className="font-semibold text-base text-palabre-text mb-1">2. Appliquez</h3>
            <p className="text-xs text-palabre-muted leading-relaxed">
              Suivez les étapes de résolution pas-à-pas, copiez le code testé et évitez les pièges courants déjà documentés.
            </p>
          </div>

          <div className="bg-white border border-palabre-border rounded-card p-5 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-palabre-okBg text-palabre-ok flex items-center justify-center font-bold mb-3">
              <CheckCircle2 size={18} />
            </div>
            <h3 className="font-semibold text-base text-palabre-text mb-1">3. Confirmez</h3>
            <p className="text-xs text-palabre-muted leading-relaxed">
              Indiquez en un clic si cela fonctionne dans votre pays et votre version : la fraîcheur et la fiabilité restent transparentes.
            </p>
          </div>
        </div>
      </section>

      {/* Solutions récentes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-palabre-text">Solutions récentes</h2>
          <Link
            to="/search"
            className="text-sm font-semibold text-palabre-primary hover:underline flex items-center gap-1"
          >
            <span>Voir tout</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-palabre-border rounded-card p-4 h-44 animate-pulse" />
            ))}
          </div>
        ) : recentFiches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentFiches.map((fiche) => (
              <FicheCard
                key={fiche.id}
                fiche={fiche}
                isFavorite={favoriteIds.has(fiche.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-palabre-border rounded-card p-8 text-center">
            <p className="text-palabre-muted text-sm mb-3">
              Aucune fiche publiée pour le moment.
            </p>
            <Link
              to="/fiches/new"
              className="px-4 py-2 bg-palabre-primary text-white rounded-btn text-sm font-semibold inline-block"
            >
              Publier la première fiche
            </Link>
          </div>
        )}
      </section>

      {/* Une validation honnête */}
      <section className="bg-white border border-palabre-border rounded-card p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2 text-palabre-primary">
          <ShieldCheck size={20} />
          <h2 className="text-lg font-bold text-palabre-text">Une validation honnête et collaborative</h2>
        </div>
        <p className="text-xs sm:text-sm text-palabre-muted leading-relaxed mb-4">
          Une confirmation vaut toujours pour un contexte précis (pays, opérateur, version d'API). Une fiche sans confirmation récente est marquée « À revérifier » : cela ne signifie pas qu'elle est erronée, mais qu'un nouveau test communautaire est nécessaire.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge status="ok" />
          <Badge status="re" />
          <Badge status="fl" />
          <Badge status="new" />
        </div>
      </section>
    </div>
  );
};

