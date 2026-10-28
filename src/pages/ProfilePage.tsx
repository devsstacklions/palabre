import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ficheService } from '../services/fiche.service';
import { favoriteService } from '../services/favorite.service';
import { entraideService } from '../services/entraide.service';
import { FicheCard } from '../components/fiches/FicheCard';
import { QuestionStatusBadge } from '../components/entraide/QuestionStatusBadge';
import { Fiche, Question } from '../types';
import { PAYS, TECHNOLOGIES } from '../lib/constants';
import { FileText, Bookmark, Settings, Edit3, Trash2, CheckCircle2, HelpCircle, MessageSquare, } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, profile, updateProfile, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'pub';
  const navigate = useNavigate();

  const [myFiches, setMyFiches] = useState<Fiche[]>([]);
  const [drafts, setDrafts] = useState<Fiche[]>([]);
  const [favorites, setFavorites] = useState<Fiche[]>([]);
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings form state
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [selectedTechs, setSelectedTechs] = useState<string[]>(profile?.tech_stack || []);
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setCountry(profile.country || '');
      setBio(profile.bio || '');
      setSelectedTechs(profile.tech_stack || []);
      setIsPublic(profile.is_public ?? true);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([
      ficheService.getUserFiches(user.id),
      ficheService.getUserDrafts(user.id),
      favoriteService.getUserFavorites(user.id),
      entraideService.getUserQuestions(user.id),
    ])
      .then(([f, d, fav, q]) => {
        setMyFiches(f);
        setDrafts(d);
        setFavorites(fav);
        setMyQuestions(q);
      })
      .catch((err) => console.error('Erreur profil données:', err))
      .finally(() => setIsLoading(false));
  }, [user]);

  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(false);
    setSettingsError('');
    try {
      await updateProfile({
        displayName,
        country,
        bio,
        techStack: selectedTechs,
        isPublic,
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setSettingsError(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!window.confirm('Supprimer définitivement ce brouillon ?')) return;
    try {
      await ficheService.deleteFiche(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erreur suppression brouillon');
    }
  };

  const toggleTech = (tech: string) => {
    setSelectedTechs((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const userInitial = (profile?.display_name?.[0] || user?.email?.[0] || 'D').toUpperCase();

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* Header Profil */}
      <div className="flex items-center gap-4 bg-white border border-palabre-border rounded-card p-6 shadow-xs">
        <div className="w-16 h-16 rounded-full bg-palabre-primary text-white flex items-center justify-center text-2xl font-bold shrink-0">
          {userInitial}
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-palabre-text mb-0.5">
            {profile?.display_name || 'Mon profil'}
          </h1>
          <p className="text-xs text-palabre-muted">
            {profile?.country ? `${profile.country} · ` : ''}Contributeur · {myFiches.length} fiche{myFiches.length > 1 ? 's' : ''} publiée{myFiches.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-palabre-border gap-2 overflow-x-auto">
        <button
          onClick={() => setTab('pub')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            currentTab === 'pub'
              ? 'border-palabre-primary text-palabre-text'
              : 'border-transparent text-palabre-muted hover:text-palabre-text'
          }`}
        >
          <FileText size={15} />
          <span>Mes fiches ({myFiches.length})</span>
        </button>

        <button
          onClick={() => setTab('dr')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            currentTab === 'dr'
              ? 'border-palabre-primary text-palabre-text'
              : 'border-transparent text-palabre-muted hover:text-palabre-text'
          }`}
        >
          <Edit3 size={15} />
          <span>Brouillons ({drafts.length})</span>
        </button>

        <button
          onClick={() => setTab('fav')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            currentTab === 'fav'
              ? 'border-palabre-primary text-palabre-text'
              : 'border-transparent text-palabre-muted hover:text-palabre-text'
          }`}
        >
          <Bookmark size={15} />
          <span>Favoris ({favorites.length})</span>
        </button>

        <button
          onClick={() => setTab('q')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            currentTab === 'q'
              ? 'border-palabre-primary text-palabre-text'
              : 'border-transparent text-palabre-muted hover:text-palabre-text'
          }`}
        >
          <HelpCircle size={15} />
          <span>Questions ({myQuestions.length})</span>
        </button>

        <button
          onClick={() => setTab('set')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            currentTab === 'set'
              ? 'border-palabre-primary text-palabre-text'
              : 'border-transparent text-palabre-muted hover:text-palabre-text'
          }`}
        >
          <Settings size={15} />
          <span>Paramètres</span>
        </button>
      </div>

      {/* Contenu des onglets */}
      {currentTab === 'pub' && (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white border border-palabre-border rounded-card p-4 h-40 animate-pulse" />
              ))}
            </div>
          ) : myFiches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myFiches.map((fiche) => (
                <div key={fiche.id} className="space-y-1">
                  <FicheCard fiche={fiche} />
                  <div className="flex justify-end pr-1">
                    <Link
                      to={`/fiches/${fiche.id}/edit`}
                      className="text-xs font-semibold text-palabre-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Edit3 size={12} />
                      <span>Modifier cette fiche</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-palabre-border rounded-card p-8 text-center space-y-3">
              <h2 className="text-base font-bold text-palabre-text">Aucune contribution pour l'instant</h2>
              <p className="text-xs text-palabre-muted max-w-sm mx-auto">
                Partagez votre première solution pour aider d'autres développeurs confrontés aux mêmes problématiques.
              </p>
              <Link
                to="/fiches/new"
                className="px-4 py-2 bg-palabre-primary text-white rounded-btn text-xs font-semibold inline-block"
              >
                Publier une fiche
              </Link>
            </div>
          )}
        </div>
      )}

      {currentTab === 'dr' && (
        <div className="space-y-3">
          {drafts.length > 0 ? (
            drafts.map((d) => (
              <div
                key={d.id}
                className="bg-white border border-palabre-border rounded-card p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <strong className="text-sm font-semibold text-palabre-text block">
                    {d.title || 'Brouillon sans titre'}
                  </strong>
                  <span className="text-xs text-palabre-muted">
                    {d.country || 'Pays non défini'} · {d.operator_service || 'Opérateur non défini'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteDraft(d.id)}
                    className="p-1.5 text-palabre-muted hover:text-red-600 rounded-btn transition-colors cursor-pointer"
                    title="Supprimer ce brouillon"
                  >
                    <Trash2 size={16} />
                  </button>
                  <Link
                    to={`/fiches/new?draft=${d.id}`}
                    className="px-3 py-1.5 bg-white border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs font-semibold cursor-pointer"
                  >
                    Reprendre
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-palabre-border rounded-card p-8 text-center text-xs text-palabre-muted">
              Aucun brouillon en cours.
            </div>
          )}
        </div>
      )}

      {currentTab === 'fav' && (
        <div>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map((fiche) => (
                <FicheCard key={fiche.id} fiche={fiche} isFavorite={true} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-palabre-border rounded-card p-8 text-center space-y-3">
              <h2 className="text-base font-bold text-palabre-text">Aucun favori enregistré</h2>
              <p className="text-xs text-palabre-muted max-w-sm mx-auto">
                Enregistrez des fiches techniques pour les retrouver facilement hors connexion ou lors de vos développements.
              </p>
              <Link
                to="/search"
                className="px-4 py-2 bg-palabre-primary text-white rounded-btn text-xs font-semibold inline-block"
              >
                Découvrir des solutions
              </Link>
            </div>
          )}
        </div>
      )}

      {currentTab === 'q' && (
        <div className="space-y-3">
          {myQuestions.length > 0 ? (
            myQuestions.map((q) => (
              <div
                key={q.id}
                className="bg-white border border-palabre-border rounded-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <QuestionStatusBadge status={q.status} />
                    <span className="text-xs font-semibold text-palabre-text">{q.technology}</span>
                    {q.framework && (
                      <span className="text-xs text-palabre-muted">· {q.framework}</span>
                    )}
                  </div>
                  <Link
                    to={`/entraide/${q.id}`}
                    className="text-sm font-bold text-palabre-text hover:text-palabre-primary line-clamp-1"
                  >
                    {q.title}
                  </Link>
                  <p className="text-xs text-palabre-muted line-clamp-1 mt-0.5">{q.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <MessageSquare size={13} />
                    <span>{q.answers_count} rép.</span>
                  </span>
                  <Link
                    to={`/entraide/${q.id}`}
                    className="px-3 py-1.5 bg-palabre-bg border border-palabre-border hover:bg-slate-50 text-palabre-text rounded-btn text-xs font-semibold"
                  >
                    Voir
                  </Link>
                  <Link
                    to={`/entraide/${q.id}/edit`}
                    className="px-3 py-1.5 bg-palabre-primary text-white rounded-btn text-xs font-semibold hover:bg-[#0c4a3b]"
                  >
                    Modifier
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-palabre-border rounded-card p-8 text-center space-y-3">
              <h2 className="text-base font-bold text-palabre-text">Aucune question d'entraide</h2>
              <p className="text-xs text-palabre-muted max-w-sm mx-auto">
                Vous n'avez pas encore posé de question sur l'espace d'entraide technique.
              </p>
              <Link
                to="/entraide/new"
                className="px-4 py-2 bg-palabre-primary text-white rounded-btn text-xs font-semibold inline-block"
              >
                Poser un problème
              </Link>
            </div>
          )}
        </div>
      )}

      {currentTab === 'set' && (
        <div className="bg-white border border-palabre-border rounded-card p-6 shadow-xs max-w-xl">
          <h2 className="text-base font-bold text-palabre-text mb-4">Paramètres du profil</h2>

          {settingsSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-btn flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>Paramètres enregistrés avec succès.</span>
            </div>
          )}

          {settingsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-btn">
              {settingsError}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Nom d'affichage *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Pays de résidence
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
              >
                <option value="">Sélectionner</option>
                {PAYS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1">
                Présentation / Bio
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex. : Développeur backend Node.js & Go, spécialisé dans les paiements mobiles en Afrique de l'Ouest."
                className="w-full px-3 py-2 bg-palabre-bg border border-palabre-border rounded-btn text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-palabre-text mb-1.5">
                Technologies maîtrisées
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TECHNOLOGIES.map((tech) => {
                  const isSelected = selectedTechs.includes(tech);
                  return (
                    <button
                      type="button"
                      key={tech}
                      onClick={() => toggleTech(tech)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-palabre-primaryLight text-palabre-primary border-emerald-300'
                          : 'bg-white text-palabre-muted border-palabre-border hover:bg-slate-50'
                      }`}
                    >
                      {tech}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-medium text-palabre-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded text-palabre-primary focus:ring-palabre-primary"
                />
                <span>Profil public visible par la communauté</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                Enregistrer les modifications
              </button>

              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-btn text-xs font-semibold transition-colors cursor-pointer"
              >
                Se déconnecter
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
