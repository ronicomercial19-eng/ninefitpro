import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { getAthleteByUserId, getAthleteByEmail } from '@/services/athletes.service';
import { getUserRole } from '@/services/auth.service';
import { AUTH_CALLBACK } from '@/lib/loginDestination';
import { resolveRole, isStaffRole, isAdminRole } from '@/lib/authRole';
import { createAuthSessionGate } from '@/lib/authSessionGate';
import { useQueryClient } from '@tanstack/react-query';
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

interface CanonicalIdentity {
  user_id: string;
  email: string;
  full_name: string | null;
  profile_role: string;
  is_active: boolean | null;
  first_access_completed: boolean;
  athlete_id: string | null;
  aluno_id: string | null;
  coach_id: string | null;
  athlete_name: string | null;
  athlete_email: string | null;
  athlete_activated: boolean | null;
  roles: Array<{ role: string }>;
}

export type RoleStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AuthContextType {
  roleStatus: RoleStatus;
  retryIdentity: () => Promise<void>;
  user: User | null;
  profile: Profile | null;
  studentProfile: StudentProfile | null;
  session: Session | null;
  userRole: string | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
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
  const [roleStatus, setRoleStatus] = useState<RoleStatus>('idle');

  // Geração de sessão: respostas antigas são descartadas ao trocar de usuário.
  const genRef = React.useRef(createAuthSessionGate());
  const identityUserRef = React.useRef<string | null>(null);
  const queryClient = useQueryClient();

  const loadIdentity = React.useCallback(async (u: User, gen = genRef.current.next()) => {
    const gate = genRef.current;
    const alive = () => gate.isCurrent(gen);
    if (!alive()) return;
    setLoading(true);
    setRoleStatus('loading');
    setProfile(null); setStudentProfile(null); setUserRole(null);
    try {
      const { data, error } = await supabase
        .from('vw_current_identity').select('*').eq('user_id', u.id).maybeSingle();
      if (!alive()) return;
      let profileRole: string | null = null;
      let roles: string[] = [];
      if (!error && data) {
        const identity = data as unknown as CanonicalIdentity;
        if (identity.user_id !== u.id) throw new Error('Identidade incompatível com a sessão');
        profileRole = identity.profile_role ?? null;
        roles = (identity.roles || []).map((r) => r.role);
        setProfile({
          id: identity.user_id, user_id: identity.user_id, email: identity.email,
          full_name: identity.full_name, role: identity.profile_role, phone: null,
          avatar_url: null, is_active: identity.is_active ?? true,
        });
        if (identity.athlete_id && identity.athlete_name) {
          setStudentProfile({
            id: identity.athlete_id, email: identity.athlete_email, name: identity.athlete_name,
            activated: identity.athlete_activated, coach_id: identity.coach_id ?? undefined,
          });
        }
      } else {
        const fallback = await supabase.from('profiles').select('*').eq('user_id', u.id).maybeSingle();
        if (!alive()) return;
        if (fallback.error) throw fallback.error;
        if (fallback.data) { setProfile(fallback.data as Profile); profileRole = (fallback.data as Profile).role; }
      }
      let role = resolveRole(profileRole, roles);
      if (!role) {
        const r = await getUserRole(u.id);
        if (!alive()) return;
        if (!r.success || !r.data) throw new Error('Não foi possível verificar seu papel');
        role = r.data;
      }
      if (!alive()) return;
      setUserRole(role);
      await fetchStudentProfile(u.id, u.email, alive);
      if (alive()) setRoleStatus('ready');
    } catch (error) {
      console.error('[Auth] falha ao carregar identidade', error);
      if (alive()) setRoleStatus('error');
    } finally {
      if (alive()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // A fresh gate is required when React StrictMode mounts the effect again.
    const gate = createAuthSessionGate();
    genRef.current = gate;
    const apply = (s: Session | null) => {
      const gen = gate.next();
      if (identityUserRef.current !== (s?.user.id ?? null)) {
        queryClient.clear();
        identityUserRef.current = s?.user.id ?? null;
      }
      setProfile(null); setStudentProfile(null); setUserRole(null);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const u = s.user;
        setRoleStatus('loading');
        setLoading(true);
        setTimeout(() => { if (gate.isCurrent(gen)) void loadIdentity(u, gen); }, 0);
      } else {
        setProfile(null); setStudentProfile(null); setUserRole(null); setRoleStatus('idle');
        setLoading(false);
      }
    };
    let lastUserId: string | null | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      gate.observe();
      const uid = s?.user?.id ?? null;
      // TOKEN_REFRESHED do mesmo usuário não precisa recarregar papel
      if (uid === lastUserId && event !== 'USER_UPDATED' && event !== 'SIGNED_IN') { setSession(s); return; }
      lastUserId = uid;
      apply(s);
    });
    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error) throw error;
      if (!gate.canApplyInitial()) return;
      const uid = s?.user?.id ?? null;
      if (uid === lastUserId) return;
      lastUserId = uid;
      apply(s);
    }).catch(() => {
      if (gate.canApplyInitial()) { setRoleStatus('error'); setLoading(false); }
    });
    return () => { gate.dispose(); subscription.unsubscribe(); };
  }, [loadIdentity, queryClient]);

  const retryIdentity = async () => { if (user) await loadIdentity(user); };

  // Now uses athletes table via service layer instead of legacy students table
  const fetchStudentProfile = async (userId: string, userEmail: string | undefined, alive: () => boolean = () => true) => {
    try {
      // Try by user_id first (includes athlete_auth_link fallback)
      const result = await getAthleteByUserId(userId);
      if (!alive()) return;
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
        if (!alive()) return;
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

      if (alive()) setStudentProfile(null);
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
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}${AUTH_CALLBACK}`, data: { full_name: name } },
      });
      if (error) return { error: error.message };
      return { needsEmailConfirmation: !data.session };
    } catch (error: any) { return { error: error.message || 'Erro no registro' }; }
    finally { setLoading(false); }
  };

  const logout = async () => {
    try { mirrorEvent('logout', {}, null, user?.email ?? null); } catch {}
    genRef.current.next();
    queryClient.clear();
    identityUserRef.current = null;
    setUser(null); setProfile(null); setStudentProfile(null); setSession(null); setUserRole(null); setRoleStatus('idle'); setLoading(false);
    await supabase.auth.signOut();
    try {
      localStorage.removeItem('ninefit_token');
      localStorage.removeItem('ninefit_user_id');
      sessionStorage.removeItem('ninefit_redirect_attempted');
    } catch {}
    setUser(null); setProfile(null); setStudentProfile(null); setSession(null); setUserRole(null); setRoleStatus('idle');
  };

  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = isAdminRole(userRole);
  const isTrainer = isStaffRole(userRole);
  const isStudent = userRole === 'student' || userRole === 'user' || Boolean(studentProfile);

  return <AuthContext.Provider value={{ roleStatus, retryIdentity, user, profile, studentProfile, session, userRole, login, register, logout, loading, isSuperAdmin, isAdmin, isTrainer, isStudent }}>{children}</AuthContext.Provider>;
};

