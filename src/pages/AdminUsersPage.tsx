import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import { adminService, AdminUserPage } from '../services/admin.service';
import { formatRelativeDate } from '../lib/utils';

const PAGE_SIZE = 20;

export const AdminUsersPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminUserPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setResult(await adminService.getUsers(search, page, PAGE_SIZE));
    } catch (cause) {
      console.error('Erreur de chargement des comptes:', cause);
      setResult(null);
      setError('Impossible de charger les comptes. Vérifiez la connexion Supabase puis réessayez.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-palabre-primary">Administration</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Comptes utilisateurs</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Répertoire des profils, consultable par nom d’utilisateur. Les adresses e-mail ne sont pas exposées dans cet espace.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex max-w-xl gap-2">
        <label htmlFor="admin-user-search" className="sr-only">Rechercher par nom d’utilisateur</label>
        <div className="relative min-w-0 flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="admin-user-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Rechercher un nom d’utilisateur"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder:text-slate-400"
          />
        </div>
        <button type="submit" className="rounded-lg bg-palabre-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-palabre-primaryHover">
          Rechercher
        </button>
      </form>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle size={17} aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={() => void loadUsers()} className="ml-auto font-semibold underline">Réessayer</button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-semibold">Profils enregistrés</h3>
            <p className="mt-1 text-xs text-slate-500">
              {isLoading ? 'Chargement…' : `${result?.total ?? 0} profil${result?.total === 1 ? '' : 's'}`}
            </p>
          </div>
          <Users size={19} className="text-slate-400" aria-hidden="true" />
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Chargement des comptes…</p>
        ) : error ? (
          <p className="px-5 py-8 text-center text-sm text-red-700">
            Le répertoire des comptes n’a pas pu être chargé.
          </p>
        ) : result?.users.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Profil</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Nom d’utilisateur</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Pays</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Inscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.users.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-5 py-3.5 font-medium">{profile.display_name}</td>
                      <td className="px-5 py-3.5 text-slate-600">@{profile.username}</td>
                      <td className="px-5 py-3.5 text-slate-600">{profile.country || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-500">
                        <time dateTime={profile.created_at}>{formatRelativeDate(profile.created_at)}</time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <span className="text-xs text-slate-500">Page {page} sur {totalPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  aria-label="Page précédente"
                  className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  aria-label="Page suivante"
                  className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Aucun profil ne correspond à cette recherche.
          </p>
        )}
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Ce répertoire est en lecture seule. La désactivation de comptes et la modification des rôles nécessitent une API serveur privilégiée qui n’existe pas dans le projet actuel.
      </p>
    </div>
  );
};
