
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'student' | 'professor';
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface StudentProfile {
  id: string;
  email: string;
  nome_completo?: string;
  full_name?: string;
  telefone?: string;
  phone?: string;
  ativo?: boolean;
  status?: string;
  professor_id?: string;
  data_nascimento?: string;
  cpf?: string;
  endereco_completo?: string;
  estado_civil?: string;
  profissao?: string;
  emergencia_contato_nome?: string;
  emergencia_contato_telefone?: string;
  condicoes_medicas?: string;
  objetivos_fitness?: string;
  observacoes?: string;
  status_pagamento?: string;
  data_vencimento_plano?: string;
  whatsapp?: string;
  altura_cm?: number;
  peso_kg?: number;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  studentProfile: StudentProfile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
  isProfessor: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
            await fetchStudentProfile(session.user.email);
          }, 0);
        } else {
          setProfile(null);
          setStudentProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchStudentProfile(session.user.email);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const fetchStudentProfile = async (userEmail: string | undefined) => {
    if (!userEmail) return;
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching student profile:', error);
        return;
      }

      setStudentProfile(data || null);
    } catch (error) {
      console.error('Error in fetchStudentProfile:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error: any) {
      return { error: error.message || 'Erro no login' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error: any) {
      return { error: error.message || 'Erro no registro' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setStudentProfile(null);
    setSession(null);
  };

  const isAdmin = profile?.role === 'admin';
  const isProfessor = profile?.role === 'professor';
  const isStudent = profile?.role === 'student' || Boolean(studentProfile);

  const value = {
    user,
    profile,
    studentProfile,
    session,
    login,
    register,
    logout,
    loading,
    isAdmin,
    isProfessor,
    isStudent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
