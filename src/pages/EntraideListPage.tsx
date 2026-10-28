import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { entraideService } from '../services/entraide.service';
import { Question, QuestionStatus } from '../types';
import { QuestionCard } from '../components/entraide/QuestionCard';
import { TECHNOLOGIES } from '../lib/constants';
import { Search, PlusCircle, HelpCircle, CheckCircle2, MessageSquare, Flame } from 'lucide-react';

export const EntraideListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([...TECHNOLOGIES]);
  const [isLoading, setIsLoading] = useState(true);

  const queryParam = searchParams.get('q') || '';
  const techParam = searchParams.get('tech') || '';
  const statusParam = (searchParams.get('status') as QuestionStatus | 'all') || 'all';
  const sortParam = (searchParams.get('sort') as 'recent' | 'unanswered' | 'resolved' | 'views') || 'recent';

  const [searchInput, setSearchInput] = useState(queryParam);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const data = await entraideService.getQuestions({
        query: queryParam,
        technology: techParam,
        status: statusParam,
        sortBy: sortParam,
      });
      setQuestions(data);
    } catch (err) {
      console.error('Erreur chargement entraide:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [queryParam, techParam, statusParam, sortParam]);

  useEffect(() => {
    entraideService
      .getDistinctTechnologies()
      .then((techs) => {
        if (techs && techs.length > 0) {
          setTechnologies(techs);
        }
      })
      .catch((err) => {
        console.warn('Erreur chargement technologies distinctes:', err);
      });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      next.set('q', searchInput.trim());
    } else {
      next.delete('q');
    }
    setSearchParams(next);
  };

  const handleTechChange = (tech: string) => {
    const next = new URLSearchParams(searchParams);
    if (tech) {
      next.set('tech', tech);
    } else {
      next.delete('tech');
    }
    setSearchParams(next);
  };

  const handleStatusChange = (status: QuestionStatus | 'all') => {
    const next = new URLSearchParams(searchParams);
    if (status !== 'all') {
      next.set('status', status);
    } else {
      next.delete('status');
    }
    setSearchParams(next);
  };

  const handleSortChange = (sort: 'recent' | 'unanswered' | 'resolved' | 'views') => {
    const next = new URLSearchParams(searchParams);
    if (sort !== 'recent') {
      next.set('sort', sort);
    } else {
      next.delete('sort');
    }
    setSearchParams(next);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-palabre-border rounded-card p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Communauté CADev
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-palabre-text">
            Entraide Technique
          </h1>
          <p className="text-xs sm:text-sm text-palabre-muted mt-1 max-w-xl leading-relaxed">
            Bloqué sur un bug, un message d'erreur ou une intégration ? Posez votre question avec code et captures,
            trouvez des réponses vérifiées et enrichissez le savoir collectif des développeurs africains.
          </p>
        </div>

        <Link
          to="/entraide/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-palabre-primary hover:bg-[#0c4a3b] text-white rounded-btn text-xs sm:text-sm font-semibold transition-colors shrink-0 shadow-sm"
        >
          <PlusCircle size={16} />
          <span>Poser un problème</span>
        </Link>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white border border-palabre-border rounded-card p-4 space-y-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-palabre-muted"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par titre, message d'erreur (ex: 401 Unauthorized, CORS), technologie..."
              className="w-full pl-9 pr-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-xs sm:text-sm text-palabre-text placeholder:text-palabre-muted focus:outline-none focus:ring-1 focus:ring-palabre-primary"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-palabre-primary text-white rounded-btn text-xs sm:text-sm font-semibold hover:bg-[#0c4a3b] transition-colors cursor-pointer"
          >
            Rechercher
          </button>
        </form>

        {/* Filtres secondaires */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-palabre-border/60">
          {/* Onglets de Statut / Tri */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => handleStatusChange('all')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                statusParam === 'all'
                  ? 'bg-palabre-primary text-white font-semibold'
                  : 'bg-palabre-bg text-palabre-muted hover:text-palabre-text'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => handleStatusChange('open')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                statusParam === 'open'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-palabre-bg text-palabre-muted hover:text-palabre-text'
              }`}
            >
              Ouverts
            </button>
            <button
              onClick={() => handleStatusChange('resolved')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                statusParam === 'resolved'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-palabre-bg text-palabre-muted hover:text-palabre-text'
              }`}
            >
              <CheckCircle2 size={13} />
              Résolus
            </button>
            <button
              onClick={() => handleSortChange('unanswered')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                sortParam === 'unanswered'
                  ? 'bg-palabre-accent text-white font-semibold'
                  : 'bg-palabre-bg text-palabre-muted hover:text-palabre-text'
              }`}
            >
              <HelpCircle size={13} />
              Sans réponse
            </button>
            <button
              onClick={() => handleSortChange('views')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                sortParam === 'views'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-palabre-bg text-palabre-muted hover:text-palabre-text'
              }`}
            >
              <Flame size={13} />
              Populaires
            </button>
          </div>

          {/* Sélecteur de technologie */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-palabre-muted whitespace-nowrap">
              Technologie :
            </label>
            <select
              value={techParam}
              onChange={(e) => handleTechChange(e.target.value)}
              className="px-2.5 py-1.5 bg-palabre-bg border border-palabre-border rounded-btn text-xs text-palabre-text focus:outline-none focus:ring-1 focus:ring-palabre-primary"
            >
              <option value="">Toutes les technologies</option>
              {technologies.map((tech) => (
                <option key={tech} value={tech}>
                  {tech}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des questions */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-palabre-border rounded-card p-5 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : questions.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-palabre-muted px-1">
            {questions.length} problème{questions.length > 1 ? 's' : ''} trouvé{questions.length > 1 ? 's' : ''}
          </p>
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-palabre-border rounded-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-palabre-bg text-palabre-primary flex items-center justify-center mx-auto">
            <MessageSquare size={24} />
          </div>
          <h2 className="text-base font-bold text-palabre-text">Aucun problème trouvé</h2>
          <p className="text-xs text-palabre-muted max-w-md mx-auto leading-relaxed">
            Aucun problème ne correspond à vos filtres actuels. Posez votre question pour recevoir l'aide de la communauté !
          </p>
          <Link
            to="/entraide/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-palabre-primary text-white rounded-btn text-xs font-semibold hover:bg-[#0c4a3b] transition-colors"
          >
            <PlusCircle size={15} />
            <span>Poser le premier problème</span>
          </Link>
        </div>
      )}
    </div>
  );
};
