import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MapPin,
  Briefcase,
  MessageCircle,
  Bell,
  Send,
  Utensils
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StudentPersonalData } from "./tabs/StudentPersonalData";
import { StudentTraining } from "./tabs/StudentTraining";
import { StudentHistory } from "./tabs/StudentHistory";
import { StudentMeasurements } from "./tabs/StudentMeasurements";
import { StudentAnamnesis } from "./tabs/StudentAnamnesis";
import { StudentPhotos } from "./tabs/StudentPhotos";
import { StudentPayments } from "./tabs/StudentPayments";
import { StudentDiet } from "./tabs/StudentDiet";

interface Student {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  cpf?: string;
  data_nascimento?: string;
  objetivo: string;
  nivel_experiencia?: string;
  peso_kg?: number;
  altura_cm?: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  foto_url?: string;
  estado_civil?: string;
  profissao?: string;
  endereco_completo?: string;
  data_vencimento_plano?: string;
  forma_pagamento?: string;
  valor_mensalidade?: number;
  status_pagamento?: string;
}

interface StudentDetailedViewProps {
  student: Student;
  onBack: () => void;
  onStudentUpdated: (updatedStudent: Student) => void;
}

export function StudentDetailedView({ student, onBack, onStudentUpdated }: StudentDetailedViewProps) {
  const [currentStudent, setCurrentStudent] = useState<Student>(student);
  const [loading, setLoading] = useState(false);

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

  const getStatusBadge = (status: string = 'em_dia') => {
    const statusConfig = {
      'em_dia': { color: 'bg-green-100 text-green-800', text: 'Em Dia' },
      'atrasado': { color: 'bg-red-100 text-red-800', text: 'Atrasado' },
      'suspenso': { color: 'bg-yellow-100 text-yellow-800', text: 'Suspenso' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['em_dia'];
    
    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  const handleStudentUpdate = (updatedData: Partial<Student>) => {
    const updated = { ...currentStudent, ...updatedData };
    setCurrentStudent(updated);
    onStudentUpdated(updated);
  };

  // Generate temporary password based on student data
  const generateTempPassword = () => {
    const namePart = currentStudent.nome.split(' ')[0].toLowerCase().slice(0, 4);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${namePart}${randomNum}`;
  };

  const handleSendWhatsAppRegistration = async () => {
    const phone = currentStudent.telefone || currentStudent.whatsapp;
    if (!phone) {
      toast.error('Aluno não possui telefone cadastrado');
      return;
    }

    setLoading(true);
    const tempPassword = generateTempPassword();

    try {
      // Create auth user for athlete via edge function
      const response = await fetch(
        `https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/create-athlete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            athleteId: currentStudent.id,
            email: currentStudent.email,
            password: tempPassword,
            name: currentStudent.nome,
          }),
        }
      );

      const result = await response.json();
      
      if (!result.success) {
        console.error('Error creating user:', result.error);
        // Continue with WhatsApp even if user creation fails (might already exist)
      }
    } catch (error) {
      console.error('Error calling edge function:', error);
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const appUrl = `${window.location.origin}/9fit/login`;
    
    const message = `🏋️ *Bem-vindo ao 9FIT PRO!*

Olá ${currentStudent.nome}! 👋

Seu cadastro foi realizado com sucesso! 🎉

*Dados de acesso:*
📧 Email: ${currentStudent.email}
🔐 Senha: ${tempPassword}

*Dados do seu perfil:*
🎯 Objetivo: ${currentStudent.objetivo}
${currentStudent.nivel_experiencia ? `💪 Nível: ${currentStudent.nivel_experiencia}` : ''}

📱 *Acesse o app pelo link:*
${appUrl}

⚠️ _Recomendamos alterar sua senha no primeiro acesso._

Bons treinos! 💪🔥`;

    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Usuário criado e redirecionando para WhatsApp...');
    setLoading(false);
  };

  const handleSendNewTrainingNotification = () => {
    const phone = currentStudent.telefone || currentStudent.whatsapp;
    if (!phone) {
      toast.error('Aluno não possui telefone cadastrado');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const appUrl = `${window.location.origin}/9fit/train`;
    
    const message = `🆕 *Novo Treino Disponível!*

Olá ${currentStudent.nome}! 👋

Seu professor adicionou um *novo treino* para você no 9FIT PRO! 🏋️

📱 *Acesse agora:*
${appUrl}

Não esqueça de conferir e começar a treinar! 💪🔥

Bons treinos! 🎯`;

    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Notificação enviada via WhatsApp!');
  };

  return (
    <div className="space-y-6">
      {/* Header com informações básicas */}
      <div className="flex items-start justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Lista
        </Button>
      </div>

      {/* Card de perfil do aluno */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {currentStudent.foto_url ? (
                <img 
                  src={currentStudent.foto_url} 
                  alt={currentStudent.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>

            {/* Informações principais */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{currentStudent.nome}</h1>
                <Badge className={currentStudent.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {currentStudent.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                {getStatusBadge(currentStudent.status_pagamento)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{currentStudent.email}</span>
                </div>
                
                {currentStudent.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{currentStudent.telefone}</span>
                  </div>
                )}
                
                {currentStudent.data_nascimento && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{calculateAge(currentStudent.data_nascimento)} anos</span>
                  </div>
                )}

                {currentStudent.profissao && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span>{currentStudent.profissao}</span>
                  </div>
                )}

                {currentStudent.endereco_completo && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{currentStudent.endereco_completo}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-gray-400" />
                  <span>{currentStudent.objetivo}</span>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-col gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSendWhatsAppRegistration}
                className="bg-green-500 hover:bg-green-600 text-white border-green-500"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Enviar Cadastro
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSendNewTrainingNotification}
                className="bg-neon-400 hover:bg-neon-400/90 text-black border-neon-400"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notificar Treino
              </Button>
              <Button size="sm" variant="outline">
                Editar Perfil
              </Button>
              <Button size="sm" variant="outline">
                Agendar Aula
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Abas principais */}
      <Tabs defaultValue="dados-pessoais" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="dados-pessoais" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden lg:inline">Dados</span>
          </TabsTrigger>
          <TabsTrigger value="treino" className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            <span className="hidden lg:inline">Treino</span>
          </TabsTrigger>
          <TabsTrigger value="dieta" className="flex items-center gap-2">
            <Utensils className="w-4 h-4" />
            <span className="hidden lg:inline">Dieta</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden lg:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="medidas" className="flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            <span className="hidden lg:inline">Medidas</span>
          </TabsTrigger>
          <TabsTrigger value="anamneses" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden lg:inline">Anamneses</span>
          </TabsTrigger>
          <TabsTrigger value="fotos" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span className="hidden lg:inline">Fotos</span>
          </TabsTrigger>
          <TabsTrigger value="mensalidade" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden lg:inline">Mensalidade</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados-pessoais">
          <StudentPersonalData 
            student={currentStudent} 
            onStudentUpdate={handleStudentUpdate}
          />
        </TabsContent>

        <TabsContent value="treino">
          <StudentTraining 
            student={currentStudent}
            onStudentUpdate={handleStudentUpdate}
          />
        </TabsContent>

        <TabsContent value="dieta">
          <StudentDiet student={currentStudent} />
        </TabsContent>

        <TabsContent value="historico">
          <StudentHistory studentId={currentStudent.id} />
        </TabsContent>

        <TabsContent value="medidas">
          <StudentMeasurements studentId={currentStudent.id} />
        </TabsContent>

        <TabsContent value="anamneses">
          <StudentAnamnesis studentId={currentStudent.id} />
        </TabsContent>

        <TabsContent value="fotos">
          <StudentPhotos studentId={currentStudent.id} />
        </TabsContent>

        <TabsContent value="mensalidade">
          <StudentPayments 
            student={currentStudent}
            onStudentUpdate={handleStudentUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}