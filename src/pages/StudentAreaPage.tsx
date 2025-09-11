import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  User,
  Dumbbell,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Edit,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  idade?: number;
  endereco?: string;
  objetivo?: string;
  nivel?: string;
  ativo?: boolean;
  data_cadastro?: string;
  data_nascimento?: string;
  criado_em?: string;
  altura?: number;
  peso?: number;
  avatar_url?: string;
}

interface WorkoutHistory {
  id: string;
  name: string;
  type: string;
  status: 'ativo' | 'vencido' | 'concluido';
  start_date: string;
  end_date?: string;
  progress: number;
  total_sessions: number;
  completed_sessions: number;
}

export default function StudentAreaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('id');
  
  const [student, setStudent] = useState<Student | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'ativo' | 'vencido'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      // Fetch student data
      const { data: studentData, error: studentError } = await supabase
        .from('estudantes')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) {
        console.error('Error fetching student:', studentError);
        toast.error('Erro ao carregar dados do aluno');
        return;
      }

      setStudent(studentData);

      // Fetch workout history (sample data for now)
      const sampleWorkouts: WorkoutHistory[] = [
        {
          id: '1',
          name: 'HIIT Cardio',
          type: 'Cardio',
          status: 'ativo',
          start_date: '2024-01-15',
          progress: 75,
          total_sessions: 12,
          completed_sessions: 9
        },
        {
          id: '2',
          name: 'Yoga Relax',
          type: 'Flexibilidade',
          status: 'vencido',
          start_date: '2023-12-01',
          end_date: '2024-01-01',
          progress: 100,
          total_sessions: 15,
          completed_sessions: 15
        },
        {
          id: '3',
          name: 'Noções Básicas',
          type: 'Fundamentos',
          status: 'vencido',
          start_date: '2023-11-01',
          end_date: '2023-11-30',
          progress: 85,
          total_sessions: 10,
          completed_sessions: 8
        },
        {
          id: '4',
          name: 'Força Funcional',
          type: 'Força',
          status: 'ativo',
          start_date: '2024-01-10',
          progress: 40,
          total_sessions: 20,
          completed_sessions: 8
        }
      ];

      setWorkoutHistory(sampleWorkouts);

    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Erro ao carregar dados do aluno');
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkouts = workoutHistory.filter(workout => {
    if (activeFilter === 'all') return true;
    return workout.status === activeFilter;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      ativo: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: <CheckCircle className="w-3 h-3" /> },
      vencido: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: <AlertCircle className="w-3 h-3" /> },
      concluido: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: <CheckCircle className="w-3 h-3" /> }
    };

    const variant = variants[status as keyof typeof variants];
    
    return (
      <Badge className={variant.className}>
        <div className="flex items-center gap-1">
          {variant.icon}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </Badge>
    );
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleManageWorkout = (workoutId: string) => {
    toast.info(`Gerenciando treino ID: ${workoutId}`);
    // Navigate to workout management or open modal
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Aluno não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              O aluno solicitado não foi encontrado.
            </p>
            <Button onClick={() => navigate(-1)}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar para Lista
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Área do Aluno</h1>
            <p className="text-muted-foreground">
              Gerencie informações e histórico do aluno
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Edit className="w-4 h-4" />
            Editar
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Student Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar and Name */}
              <div className="flex flex-col items-center md:items-start">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarImage src={student.avatar_url} alt={student.nome} />
                  <AvatarFallback className="text-lg">
                    {student.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-foreground mb-2">{student.nome}</h2>
                    {getStatusBadge(student.ativo ? 'ativo' : 'vencido')}
                  </div>
              </div>

              {/* Personal Information */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{student.email}</span>
                  </div>
                  {student.telefone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{student.telefone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Cadastrado em {student.data_cadastro ? new Date(student.data_cadastro).toLocaleDateString('pt-BR') : 
                                    student.criado_em ? new Date(student.criado_em).toLocaleDateString('pt-BR') : 'Data não disponível'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span className="text-sm">
                      {student.idade ? `${student.idade} anos` : 'Idade não informada'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Dumbbell className="w-4 h-4" />
                    <span className="text-sm">Objetivo: {student.objetivo || 'Não informado'}</span>
                  </div>
                  {student.endereco && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{student.endereco}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="personal-info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal-info">Informações Pessoais</TabsTrigger>
            <TabsTrigger value="workout-history">Histórico de Treinos</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal-info">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais Detalhadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                      <p className="text-foreground mt-1">{student.nome}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                      <p className="text-foreground mt-1">{student.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <p className="text-foreground mt-1">{student.telefone || 'Não informado'}</p>
                    </div>
                  </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Objetivo</label>
              <p className="text-foreground mt-1">{student.objetivo || 'Não informado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nível</label>
              <p className="text-foreground mt-1">{student.nivel || 'Não informado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                {getStatusBadge(student.ativo ? 'ativo' : 'vencido')}
              </div>
            </div>
          </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workout History Tab */}
          <TabsContent value="workout-history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Histórico de Treinos</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant={activeFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveFilter('all')}
                    >
                      Todos
                    </Button>
                    <Button 
                      variant={activeFilter === 'ativo' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveFilter('ativo')}
                    >
                      Treinos Ativos
                    </Button>
                    <Button 
                      variant={activeFilter === 'vencido' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveFilter('vencido')}
                    >
                      Treinos Vencidos
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredWorkouts.map((workout) => (
                    <div key={workout.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-foreground">{workout.name}</h4>
                          {getStatusBadge(workout.status)}
                          <Badge variant="outline">{workout.type}</Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Início: {new Date(workout.start_date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          {workout.end_date && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Fim: {new Date(workout.end_date).toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              Progresso: {workout.completed_sessions}/{workout.total_sessions} sessões
                            </span>
                            <span className="text-xs text-muted-foreground">{workout.progress}%</span>
                          </div>
                          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${workout.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="ml-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Gerenciar
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações do Treino</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleManageWorkout(workout.id)}>
                              <Settings className="mr-2 h-4 w-4" />
                              Configurar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Clock className="mr-2 h-4 w-4" />
                              Ver Progresso
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}

                  {filteredWorkouts.length === 0 && (
                    <div className="text-center py-8">
                      <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Nenhum treino encontrado
                      </h3>
                      <p className="text-muted-foreground">
                        {activeFilter === 'all' ? 'Este aluno ainda não possui treinos cadastrados.' : 
                         `Não há treinos com status "${activeFilter}" para este aluno.`}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}