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
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#123F35] px-6 py-9 text-white shadow-xl shadow-emerald-950/10 sm:px-10 sm:py-12 lg:px-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-[44px] border-white/[0.045]" />
        <div aria-hidden="true" className="pointer-events-none absolute right-20 top-12 -z-10 h-3 w-3 rounded-full bg-[#EAA35D] shadow-[0_0_32px_12px_rgba(234,163,93,0.2)]" />
        <div className="max-w-4xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-50 backdrop-blur">
          <Sparkles size={13} />
          <span>CADev 2026 · Par les devs, pour les devs</span>
        </div>
        <h1 className="mb-4 text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
          La bonne solution, <br className="hidden sm:inline" />
          <span className="text-[#A9E1C9]">testée chez vous.</span>
        </h1>
        <p className="mb-7 max-w-3xl text-sm leading-7 text-emerald-50/80 sm:text-base">
          Palabre rassemble des fiches techniques contextualisées pour l'Afrique : Mobile Money (Wave, Orange, MTN), SMS, USSD, contraintes réseau et passerelles locales, datées et confirmées par la communauté.
        </p>

        <SearchBar className="max-w-4xl" />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            to="/search"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#EAA35D] px-5 py-2.5 text-sm font-bold text-[#2C281F] shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#F2B978]"
          >
            <span>Explorer les solutions</span>
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/fiches/new"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            Partager une solution
          </Link>
        </div>
        {!user && (
          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/15 pt-5 text-sm">
            <span className="text-emerald-50/70">Déjà membre ?</span>
            <Link to="/login" className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
              Connexion utilisateur
            </Link>
          </div>
        )}
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
