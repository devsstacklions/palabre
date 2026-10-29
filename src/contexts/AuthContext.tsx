import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService } from '../services/auth.service';
import { Profile, UserRoleType } from '../types';
import { RegisterFormData, LoginFormData, ProfileUpdateFormData } from '../schemas/auth.schema';
import { profileService } from '../services/profile.service';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRoleType;
  isAdmin: boolean;
  isModerator: boolean;
  isLoading: boolean;
<<<<<<< HEAD
  login: (data: LoginFormData) => Promise<UserRoleType>;
  register: (data: RegisterFormData, confirmationPath?: string, adminPortal?: boolean) => Promise<{ hasSession: boolean; role: UserRoleType }>;
=======
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
  logout: () => Promise<void>;
  updateProfile: (data: ProfileUpdateFormData) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRoleType>('user');
  const [isLoading, setIsLoading] = useState(true);

<<<<<<< HEAD
  const fetchUserData = async (
    currentUser: User | null,
    strictRoleCheck = false
  ): Promise<UserRoleType> => {
    if (!currentUser) {
      setProfile(null);
      setRole('user');
      return 'user';
    }

    setProfile(null);
    setRole('user');
=======
  const fetchUserData = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setRole('user');
      return;
    }

>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
    try {
      const [userProfile, userRole] = await Promise.all([
        authService.getUserProfile(currentUser.id),
        authService.getUserRole(currentUser.id),
      ]);

      if (userProfile) {
        setProfile(userProfile);
      } else {
        // Profil temporaire si non encore inséré
        const metadata = currentUser.user_metadata || {};
        const fallbackProfile: Profile = {
          id: currentUser.id,
          username: metadata.username || (currentUser.email?.split('@')[0] ?? 'dev'),
          display_name: metadata.display_name || metadata.name || (currentUser.email?.split('@')[0] ?? 'Développeur'),
          country: metadata.country || null,
          tech_stack: [],
          is_public: true,
          email: currentUser.email || null,
          created_at: currentUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
      }

      setRole(userRole);
<<<<<<< HEAD
      return userRole;
    } catch (err) {
      console.warn('Erreur lors du chargement des données utilisateur:', err);
      setRole('user');
      if (strictRoleCheck) throw err;
      return 'user';
=======
    } catch (err) {
      console.warn('Erreur lors du chargement des données utilisateur:', err);
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
    }
  };

  useEffect(() => {
    let mounted = true;
<<<<<<< HEAD
    let loadVersion = 0;

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          throw error;
        }

        const currentUser = data.session?.user ?? null;
        setSession(data.session ?? null);
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          setRole('user');
          setIsLoading(false);
          return;
        }

        const currentVersion = ++loadVersion;
        setIsLoading(true);
        window.setTimeout(() => {
          if (!mounted || currentVersion !== loadVersion) return;
          void fetchUserData(currentUser)
            .catch((err) => {
              console.warn('Chargement du profil après initialisation de session:', err);
            })
            .finally(() => {
              if (mounted && currentVersion === loadVersion) setIsLoading(false);
            });
        }, 0);
      } catch (err) {
        console.warn('Erreur lors de la récupération de la session initiale:', err);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole('user');
          setIsLoading(false);
        }
      }
    };

    void initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      const currentVersion = ++loadVersion;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (!newSession?.user) {
        setProfile(null);
        setRole('user');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      window.setTimeout(() => {
        if (!mounted || currentVersion !== loadVersion) return;
        void fetchUserData(newSession.user)
          .catch((err) => {
            console.warn('Chargement du profil après changement de session:', err);
          })
          .finally(() => {
            if (mounted && currentVersion === loadVersion) setIsLoading(false);
          });
      }, 0);
=======

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          if (data.session?.user) {
            await fetchUserData(data.session.user);
          }
        }
      } catch (err) {
        console.warn('Initialisation session auth:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchUserData(newSession.user);
      } else {
        setProfile(null);
        setRole('user');
      }
      setIsLoading(false);
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
    });

    return () => {
      mounted = false;
<<<<<<< HEAD
      loadVersion += 1;
=======
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
      subscription.unsubscribe();
    };
  }, []);

  const login = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const res = await authService.login(data.email, data.password);
      setUser(res.user);
      setSession(res.session);
      if (res.user) {
<<<<<<< HEAD
        try {
          return await fetchUserData(res.user, true);
        } catch (error) {
          try {
            await authService.logout();
          } catch (logoutError) {
            console.error('Impossible de fermer la session après échec de vérification du rôle:', logoutError);
          }
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole('user');
          throw error;
        }
      }
      return 'user';
=======
        await fetchUserData(res.user);
      }
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
    } finally {
      setIsLoading(false);
    }
  };

<<<<<<< HEAD
  const register = async (data: RegisterFormData, confirmationPath?: string, adminPortal = false) => {
=======
  const register = async (data: RegisterFormData) => {
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
    setIsLoading(true);
    try {
      const res = await authService.register({
        email: data.email,
        password: data.password,
        username: data.username,
        displayName: data.displayName,
        country: data.country,
<<<<<<< HEAD
        adminPortal,
      }, confirmationPath);
      setUser(res.session ? res.user : null);
      setSession(res.session);
      let registeredRole: UserRoleType = 'user';
      if (res.session && res.user) {
        registeredRole = await fetchUserData(res.user);
      } else {
        setProfile(null);
        setRole('user');
      }
      return { hasSession: Boolean(res.session), role: registeredRole };
=======
      });
      setUser(res.user);
      setSession(res.session);
      if (res.user) {
        await fetchUserData(res.user);
      }
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole('user');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: ProfileUpdateFormData) => {
    if (!user) throw new Error('Utilisateur non connecté');
    const updated = await profileService.updateProfile(user.id, data);
    setProfile(updated);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      role,
      isAdmin: role === 'admin',
      isModerator: role === 'admin' || role === 'moderator',
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      refreshProfile,
    }),
    [user, session, profile, role, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé au sein d’un AuthProvider');
  }
  return context;
};
<<<<<<< HEAD
=======

>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
