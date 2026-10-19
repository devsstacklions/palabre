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
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
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

  const fetchUserData = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setRole('user');
      return;
    }

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
    } catch (err) {
      console.warn('Erreur lors du chargement des données utilisateur:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

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
    });

    return () => {
      mounted = false;
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
        await fetchUserData(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const res = await authService.register({
        email: data.email,
        password: data.password,
        username: data.username,
        displayName: data.displayName,
        country: data.country,
      });
      setUser(res.user);
      setSession(res.session);
      if (res.user) {
        await fetchUserData(res.user);
      }
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

