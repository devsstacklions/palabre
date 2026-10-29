import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notification.service';
<<<<<<< HEAD
import { Menu, X, Bell, UserRound, UserPlus, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, profile, isModerator, isAdmin, logout } = useAuth();
=======
import { Menu, X, Bell } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, profile, isAdmin, isModerator, logout } = useAuth();
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
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
<<<<<<< HEAD
    <header className="sticky top-0 z-40 border-b border-palabre-border/80 bg-white/95 shadow-sm backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
=======
    <header className="sticky top-0 z-40 bg-white border-b border-palabre-border">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
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
<<<<<<< HEAD
        <nav className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto py-1">
=======
        <nav className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto py-1">
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
          <NavLink to="/search" className={navLinkClass}>
            Explorer
          </NavLink>
          <NavLink to="/categories" className={navLinkClass}>
            Catégories
          </NavLink>
          <NavLink to="/fiches/new" className={navLinkClass}>
            Publier
          </NavLink>

          {user && (
            <>
<<<<<<< HEAD
=======
              <NavLink to="/dashboard" className={navLinkClass}>
                Tableau de bord
              </NavLink>
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
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

<<<<<<< HEAD
          {isModerator && (
            <NavLink to="/moderation" className={navLinkClass}>
              Modération
            </NavLink>
          )}
                  {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              <span className="flex items-center gap-1.5"><ShieldCheck size={15} /> Console admin</span>
            </NavLink>
          )}
=======
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
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
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
<<<<<<< HEAD
            <>
              <Link
                to="/login?mode=user"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-palabre-border bg-white px-3 py-2 text-sm font-semibold text-palabre-text transition-colors hover:border-palabre-primary/40 hover:bg-palabre-primaryLight"
              >
                <UserRound size={16} aria-hidden="true" />
                Connexion utilisateur
              </Link>
              <Link
                to="/login?mode=user&tab=register"
                className="hidden xl:inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-palabre-primary transition-colors hover:bg-palabre-primaryLight"
              >
                <UserPlus size={16} aria-hidden="true" />
                Créer un compte
              </Link>
            </>
=======
            <Link
              to="/login"
              className="px-4 py-2 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn text-sm font-semibold transition-colors shadow-sm"
            >
              Connexion
            </Link>
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-palabre-muted hover:text-palabre-text rounded-lg"
          aria-label="Menu"
<<<<<<< HEAD
          aria-expanded={mobileMenuOpen}
=======
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
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
<<<<<<< HEAD
=======
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-palabre-text hover:bg-palabre-bg"
              >
                Tableau de bord
              </NavLink>
              <NavLink
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
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

<<<<<<< HEAD
          {isModerator && (
            <NavLink
              to="/moderation"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-palabre-primary bg-palabre-primaryLight"
=======
          {(isAdmin || isModerator) && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50"
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
            >
              Modération & Signalements
            </NavLink>
          )}

<<<<<<< HEAD
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >Console admin</NavLink>
          )}
=======
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
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
<<<<<<< HEAD
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link
                  to="/login?mode=user"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-palabre-border bg-white px-3 py-2 text-sm font-semibold text-palabre-text hover:bg-palabre-primaryLight"
                >
                  <UserRound size={16} aria-hidden="true" />
                  Connexion utilisateur
                </Link>
                <Link
                  to="/login?mode=user&tab=register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-palabre-primaryLight px-3 py-2 text-sm font-semibold text-palabre-primary hover:bg-emerald-100"
                >
                  <UserPlus size={16} aria-hidden="true" />
                  Créer un compte
                </Link>
              </div>
=======
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2 bg-palabre-primary text-white rounded-btn font-semibold text-sm"
              >
                Connexion
              </Link>
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
            )}
          </div>
        </div>
      )}
    </header>
  );
};
<<<<<<< HEAD
=======

>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
