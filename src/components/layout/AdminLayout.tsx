import React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, ShieldCheck, ClipboardList, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navigation = [
  { to: '/admin', label: 'Vue d’ensemble', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Comptes', icon: Users, end: false },
  { to: '/admin/moderation', label: 'Modération', icon: ClipboardList, end: false },
];

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const displayName = profile?.display_name || user?.email || 'Administrateur';
  const initial = displayName[0]?.toUpperCase() || 'A';
  const pageTitle =
    pathname === '/admin/users'
      ? 'Comptes utilisateurs'
      : pathname === '/admin/moderation'
        ? 'Modération'
        : 'Vue d’ensemble';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-slate-200 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <Link to="/" className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-palabre-primary text-white">
            <ShieldCheck size={21} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight">Palabre</span>
            <span className="block text-xs text-slate-500">Console d’administration</span>
          </span>
        </Link>

        <nav aria-label="Navigation d’administration" className="flex gap-2 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pt-6">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-palabre-primaryLight text-palabre-primary'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-slate-200 p-4 lg:block">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{displayName}</span>
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                <ShieldCheck size={12} aria-hidden="true" /> Administrateur
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={16} aria-hidden="true" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Administration</p>
            <h1 className="mt-1 text-lg font-bold tracking-tight">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <ShieldCheck size={15} className="text-palabre-primary" aria-hidden="true" />
            Rôle ADMIN
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl p-5 sm:p-8">{children}</div>
        <div className="border-t border-slate-200 bg-white px-5 py-4 lg:hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-slate-600"
          >
            <LogOut size={16} aria-hidden="true" />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
};
