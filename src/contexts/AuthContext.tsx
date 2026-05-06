import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { getAthleteByUserId, getAthleteByEmail } from '@/services/athletes.service';
import { getUserRole } from '@/services/auth.service';
import { mirrorEvent } from '@/services/intelligenceHub.service';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  status?: string;
}

interface StudentProfile {
  id: string;
  email: string | null;
  name: string;
  phone?: string | null;
  activated?: boolean | null;
  coach_id?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  studentProfile: StudentProfile | null;
  session: Session | null;
  userRole: string | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isTrainer: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
            await fetchUserRole(session.user.id);
            await fetchStudentProfile(session.user.id, session.user.email);
          }, 0);
        } else {
          setProfile(null); setStudentProfile(null); setUserRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchUserRole(session.user.id);
        fetchStudentProfile(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const result = await getUserRole(userId);
      if (result.success && result.data) setUserRole(result.data);
    } catch (error) { console.error('Error fetching user role:', error); }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
      if (!error && data) setProfile(data);
    } catch (error) { console.error('Error in fetchUserProfile:', error); }
  };

  // Now uses athletes table via service layer instead of legacy students table
  const fetchStudentProfile = async (userId: string, userEmail: string | undefined) => {
    try {
      // Try by user_id first (includes athlete_auth_link fallback)
      const result = await getAthleteByUserId(userId);
      if (result.success && result.data) {
        setStudentProfile({
          id: result.data.id,
          email: result.data.email,
          name: result.data.name,
          phone: result.data.phone,
          activated: result.data.activated,
          coach_id: result.data.coach_id,
        });
        return;
      }

      // Fallback by email
      if (userEmail) {
        const emailResult = await getAthleteByEmail(userEmail);
        if (emailResult.success && emailResult.data) {
          setStudentProfile({
            id: emailResult.data.id,
            email: emailResult.data.email,
            name: emailResult.data.name,
            phone: emailResult.data.phone,
            activated: emailResult.data.activated,
            coach_id: emailResult.data.coach_id,
          });
          return;
        }
      }

      setStudentProfile(null);
    } catch (error) { console.error('Error in fetchStudentProfile:', error); }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      mirrorEvent('login', { mode: 'legacy' }, null, email);
      return {};
    } catch (error: any) { return { error: error.message || 'Erro no login' }; }
    finally { setLoading(false); }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/9fit/hub`, data: { full_name: name } },
      });
      if (error) return { error: error.message };
      return {};
    } catch (error: any) { return { error: error.message || 'Erro no registro' }; }
    finally { setLoading(false); }
  };

  const logout = async () => {
    try { mirrorEvent('logout', {}, null, user?.email ?? null); } catch {}
    await supabase.auth.signOut();
    try {
      localStorage.removeItem('ninefit_token');
      localStorage.removeItem('ninefit_user_id');
      sessionStorage.removeItem('ninefit_redirect_attempted');
    } catch {}
    setUser(null); setProfile(null); setStudentProfile(null); setSession(null); setUserRole(null);
  };

  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isTrainer = userRole === 'trainer' || userRole === 'admin' || userRole === 'super_admin';
  const isStudent = userRole === 'student' || userRole === 'user' || Boolean(studentProfile);

  return <AuthContext.Provider value={{ user, profile, studentProfile, session, userRole, login, register, logout, loading, isSuperAdmin, isAdmin, isTrainer, isStudent }}>{children}</AuthContext.Provider>;
};
