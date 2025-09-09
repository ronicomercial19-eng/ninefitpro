
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ProfessorDashboard } from "@/components/dashboard/ProfessorDashboard";
import { EnhancedStudentDashboard } from "@/components/dashboard/EnhancedStudentDashboard";
import { AdminStudentsPanel } from "@/components/admin/AdminStudentsPanel";
import { StudentRealtimeSync } from "@/components/student/StudentRealtimeSync";

const AppDashboard = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<string>('student');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles_extended')
        .select('user_type')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil:', error);
      }

      if (data) {
        setUserType(data.user_type);
      } else {
        // Criar perfil padrão se não existir
        await supabase
          .from('user_profiles_extended')
          .insert({
            user_id: user.id,
            name: profile?.full_name || user.email?.split('@')[0] || 'Usuário',
            email: user.email,
            user_type: 'student'
          });
        setUserType('student');
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Realtime sync for students */}
      <StudentRealtimeSync />
      
      {/* Navigation Header */}
      <nav className="bg-black text-white px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <div 
              className="text-2xl font-bold cursor-pointer"
              onClick={() => navigate('/')}
            >
              Mobi<span className="text-orange-500">Trainer</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-300">
              {profile?.role === 'admin' ? 'Administrador' : 
               profile?.role === 'professor' ? 'Professor' : 'Aluno'}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/profile')}
            >
              Perfil
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="p-6">
        {profile?.role === 'admin' && <AdminStudentsPanel />}
        {profile?.role === 'professor' && <ProfessorDashboard />}
        {profile?.role === 'student' && <EnhancedStudentDashboard />}
      </div>
    </div>
  );
};

export default AppDashboard;
