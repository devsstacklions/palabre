import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireModerator = false,
}) => {
  const { user, isAdmin, isModerator, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-palabre-border border-t-palabre-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-palabre-border rounded-card text-center">
        <h2 className="text-xl font-bold text-palabre-text mb-2">Accès non autorisé</h2>
        <p className="text-sm text-palabre-muted mb-4">
          Cette page est réservée aux administrateurs.
        </p>
        <Link to="/" className="text-sm font-semibold text-palabre-primary hover:underline">
          Retour à l’accueil
        </Link>
      </div>
    );
  }

  if (requireModerator && !isModerator) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-palabre-border rounded-card text-center">
        <h2 className="text-xl font-bold text-palabre-text mb-2">Accès non autorisé</h2>
        <p className="text-sm text-palabre-muted mb-4">
          Cette page est réservée à l’équipe de modération.
        </p>
        <Link to="/" className="text-sm font-semibold text-palabre-primary hover:underline">
          Retour à l’accueil
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
