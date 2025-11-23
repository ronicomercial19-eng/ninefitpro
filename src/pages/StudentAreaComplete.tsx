import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Dumbbell, 
  Activity, 
  Ruler, 
  ClipboardList, 
  Camera, 
  CreditCard,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StudentPersonalData } from "@/components/students/tabs/StudentPersonalData";
import { StudentTraining } from "@/components/students/tabs/StudentTraining";
import { StudentHistory } from "@/components/students/tabs/StudentHistory";
import { StudentMeasurements } from "@/components/students/tabs/StudentMeasurements";
import { StudentAnamnesis } from "@/components/students/tabs/StudentAnamnesis";
import { StudentPhotos } from "@/components/students/tabs/StudentPhotos";
import { StudentPayments } from "@/components/students/tabs/StudentPayments";

interface Student {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  data_nascimento?: string;
  objetivo: string;
  peso_kg?: number;
  altura_cm?: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  foto_perfil_url?: string;
  data_vencimento_plano?: string;
  forma_pagamento?: string;
  valor_mensalidade?: number;
  status_pagamento?: string;
  nivel_experiencia?: string;
  whatsapp?: string;
  cpf?: string;
  foto_url?: string;
  estado_civil?: string;
  profissao?: string;
  endereco_completo?: string;
}

export default function StudentAreaComplete() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Erro ao buscar dados do aluno:', error);
        toast.error('Erro ao carregar seus dados');
        return;
      }

      setStudent(data);
    } catch (error) {
      console.error('Erro ao buscar dados do aluno:', error);
      toast.error('Erro ao carregar seus dados');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string | undefined) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md p-6 text-center">
          <p className="mb-4">Você não está cadastrado como aluno.</p>
          <Button onClick={() => navigate('/dashboard')}>
            Ir para Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl font-bold">Minha Área</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Student Profile Card */}
      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                {student.foto_perfil_url ? (
                  <img 
                    src={student.foto_perfil_url} 
                    alt={student.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl">{student.nome}</CardTitle>
                  <Badge variant={student.ativo ? 'default' : 'secondary'}>
                    {student.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{student.email}</span>
                  </div>
                  
                  {student.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{student.telefone}</span>
                    </div>
                  )}
                  
                  {student.data_nascimento && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{calculateAge(student.data_nascimento)} anos</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" />
                    <span>{student.objetivo}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="treino" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="dados" className="flex flex-col items-center gap-1">
              <User className="w-4 h-4" />
              <span className="text-xs">Dados</span>
            </TabsTrigger>
            <TabsTrigger value="treino" className="flex flex-col items-center gap-1">
              <Dumbbell className="w-4 h-4" />
              <span className="text-xs">Treino</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex flex-col items-center gap-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="medidas" className="flex flex-col items-center gap-1">
              <Ruler className="w-4 h-4" />
              <span className="text-xs">Medidas</span>
            </TabsTrigger>
            <TabsTrigger value="anamnese" className="flex flex-col items-center gap-1">
              <ClipboardList className="w-4 h-4" />
              <span className="text-xs">Anamnese</span>
            </TabsTrigger>
            <TabsTrigger value="fotos" className="flex flex-col items-center gap-1">
              <Camera className="w-4 h-4" />
              <span className="text-xs">Fotos</span>
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="flex flex-col items-center gap-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Pagamento</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <StudentPersonalData 
              student={student} 
              onStudentUpdate={(updated) => setStudent({ ...student, ...updated })}
            />
          </TabsContent>

          <TabsContent value="treino">
            <StudentTraining 
              student={student}
              onStudentUpdate={(updated) => setStudent({ ...student, ...updated })}
            />
          </TabsContent>

          <TabsContent value="historico">
            <StudentHistory studentId={student.id} />
          </TabsContent>

          <TabsContent value="medidas">
            <StudentMeasurements studentId={student.id} />
          </TabsContent>

          <TabsContent value="anamnese">
            <StudentAnamnesis studentId={student.id} />
          </TabsContent>

          <TabsContent value="fotos">
            <StudentPhotos studentId={student.id} />
          </TabsContent>

          <TabsContent value="pagamentos">
            <StudentPayments 
              student={student}
              onStudentUpdate={(updated) => setStudent({ ...student, ...updated })}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}