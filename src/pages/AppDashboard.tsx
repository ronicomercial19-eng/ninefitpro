
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ProfessorDashboard } from "@/components/dashboard/ProfessorDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";

const AppDashboard = () => {
  const { user, logout } = useAuth();
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
            name: user.name || user.email?.split('@')[0] || 'Usuário',
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
      {/* Navigation Header */}
      <nav className="bg-black text-white px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <div 
              className="text-2xl font-bold cursor-pointer"
              onClick={() => navigate('/')}
            >
              Fit<span className="text-orange-500">Evolution</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-300">
              {userType === 'professor' ? 'Professor' : 'Aluno'}
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
      {userType === 'professor' ? <ProfessorDashboard /> : <StudentDashboard />}
    </div>
  );
};

export default AppDashboard;
