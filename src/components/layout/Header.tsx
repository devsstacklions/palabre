import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notification.service';
import { Menu, X, Bell } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, profile, isAdmin, isModerator, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    if (user) {
      notificationService
        .getUserNotifications(user.id)
        .then((items) => {
          if (isMounted) {
            setUnreadCount(items.filter((n) => !n.is_read).length);
          }
        })
        .catch(() => {});
    } else {
      setUnreadCount(0);
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-palabre-bg text-palabre-text font-semibold'
        : 'text-palabre-muted hover:text-palabre-text hover:bg-palabre-bg/70'
    }`;

  const userInitial = (profile?.display_name?.[0] || user?.email?.[0] || 'D').toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-palabre-border">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-palabre-text">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
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
          <span className="tracking-tight text-palabre-text">Palabre</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto py-1">
          <NavLink to="/search" className={navLinkClass}>
            Explorer
          </NavLink>
          <NavLink to="/entraide" className={navLinkClass}>
            Entraide
          </NavLink>
          <NavLink to="/categories" className={navLinkClass}>
            Catégories
          </NavLink>
          <NavLink to="/fiches/new" className={navLinkClass}>
            Publier
          </NavLink>

          {user && (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                Tableau de bord
              </NavLink>
              <NavLink to="/notifications" className={navLinkClass}>
                <span className="flex items-center gap-1.5">
                  <Bell size={15} />
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-palabre-accent text-white text-xs px-1.5 py-0.2 rounded-full font-bold">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                Profil
              </NavLink>
            </>
          )}

          <NavLink to="/help" className={navLinkClass}>
            Aide
          </NavLink>

          {(isAdmin || isModerator) && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-amber-800 hover:bg-amber-50'
                }`
              }
            >
              Modération
            </NavLink>
          )}
        </nav>

        {/* User / Auth actions */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-slate-50 transition-colors"
                title="Accéder à mon profil"
              >
                <div className="w-8 h-8 rounded-full bg-palabre-primary text-white flex items-center justify-center font-bold text-xs">
                  {userInitial}
                </div>
                <span className="text-sm font-medium text-palabre-text max-w-[130px] truncate">
                  {profile?.display_name || 'Mon compte'}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 border border-palabre-border rounded-btn text-xs font-semibold text-palabre-text hover:bg-slate-50 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-sm font-semibold transition-colors shadow-sm"
            >
              Connexion
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-palabre-muted hover:text-palabre-text rounded-lg"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-palabre-border bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top duration-200">
          <NavLink
            to="/search"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-palabre-text hover:bg-palabre-bg"
          >
            Explorer les solutions
          </NavLink>
          <NavLink
            to="/entraide"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-palabre-text hover:bg-palabre-bg"
          >
            Entraide technique
          </NavLink>
          <NavLink
            to="/categories"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-palabre-text hover:bg-palabre-bg"
          >
            Catégories & Pays
          </NavLink>
          <NavLink
            to="/fiches/new"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-palabre-text hover:bg-palabre-bg"
          >
            Publier une fiche
          </NavLink>

          {user && (
            <>
              <NavLink
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-palabre-text hover:bg-palabre-bg"
              >
                Tableau de bord
              </NavLink>
              <NavLink
                to="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-palabre-text hover:bg-palabre-bg"
              >
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-palabre-accent text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
              <NavLink
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-palabre-text hover:bg-palabre-bg"
              >
                Mon profil
              </NavLink>
            </>
          )}

          <NavLink
            to="/help"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-palabre-text hover:bg-palabre-bg"
          >
            Aide & Directives
          </NavLink>

          {(isAdmin || isModerator) && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50"
            >
              Modération & Signalements
            </NavLink>
          )}

          <div className="pt-3 border-t border-palabre-border">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg"
              >
                Déconnexion
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2 bg-palabre-primary text-white rounded-btn font-semibold text-sm"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

