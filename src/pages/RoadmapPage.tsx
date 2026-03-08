import { useState } from "react";
import { 
  CheckCircle2, Circle, Clock, AlertCircle, Users, Dumbbell, BarChart2,
  CreditCard, Bell, Smartphone, Shield, Sparkles, ChevronDown, ChevronUp,
  CalendarDays, FileText, Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type FeatureStatus = "done" | "in_progress" | "pending" | "blocked";

interface Feature { name: string; status: FeatureStatus; }
interface Module { id: string; title: string; icon: React.ElementType; color: string; features: Feature[]; }

const modules: Module[] = [
  {
    id: "auth", title: "Autenticação & Acesso", icon: Shield, color: "text-green-500",
    features: [
      { name: "Login Professor (Painel)", status: "done" },
      { name: "Login Aluno (9FIT PRO App)", status: "done" },
      { name: "Cadastro automático de aluno", status: "done" },
      { name: "Envio de credenciais via WhatsApp", status: "done" },
      { name: "Primeiro acesso com troca de senha", status: "done" },
      { name: "Fallback localStorage para primeiro acesso", status: "done" },
      { name: "Recuperação de senha", status: "done" },
      { name: "Login social (Google)", status: "done" },
    ],
  },
  {
    id: "students", title: "Gestão de Alunos", icon: Users, color: "text-blue-500",
    features: [
      { name: "Cadastro completo de alunos", status: "done" },
      { name: "Visualização detalhada", status: "done" },
      { name: "Dados pessoais editáveis", status: "done" },
      { name: "Histórico de atividades", status: "done" },
      { name: "Anamnese", status: "done" },
      { name: "Fotos de progresso", status: "done" },
      { name: "Upload de avaliação PDF", status: "done" },
      { name: "Excluir aluno", status: "done" },
      { name: "Resetar senha do aluno", status: "done" },
      { name: "Ativar/Desativar aluno", status: "done" },
      { name: "Alterar senha no perfil do aluno", status: "done" },
    ],
  },
  {
    id: "training", title: "Treinos & Periodização", icon: Dumbbell, color: "text-orange-500",
    features: [
      { name: "Upload de treino HTML", status: "done" },
      { name: "Visualização HTML no app aluno", status: "done" },
      { name: "Biblioteca de exercícios (Supabase)", status: "done" },
      { name: "Upload de imagem de exercício", status: "done" },
      { name: "Vídeos por URL externa", status: "done" },
      { name: "Template HTML Manager (editar/atribuir)", status: "done" },
      { name: "Super séries (persistência Supabase)", status: "done" },
      { name: "Séries de referência (persistência Supabase)", status: "done" },
      { name: "Geração de treino com IA", status: "done" },
      { name: "Periodização automática", status: "done" },
    ],
  },
  {
    id: "assessments", title: "Avaliações Físicas", icon: BarChart2, color: "text-purple-500",
    features: [
      { name: "Formulário de avaliação", status: "done" },
      { name: "Medidas corporais", status: "done" },
      { name: "Testes de força (RM)", status: "done" },
      { name: "Gráficos de evolução", status: "done" },
      { name: "Upload de PDF de avaliação", status: "done" },
      { name: "Geração de relatório PDF", status: "in_progress" },
    ],
  },
  {
    id: "scheduling", title: "Agenda & Agendamentos", icon: CalendarDays, color: "text-cyan-500",
    features: [
      { name: "Calendário mensal admin", status: "done" },
      { name: "Criar agendamento (Avaliação/Aula/Consultoria)", status: "done" },
      { name: "Agendamento multi-dia (Seg+Qua+Sex)", status: "done" },
      { name: "Visualizar por dia com cores por tipo", status: "done" },
      { name: "Concluir / Cancelar / Marcar falta", status: "done" },
      { name: "Excluir agendamento", status: "done" },
      { name: "Tela de aulas do aluno (plano + horário fixo)", status: "done" },
      { name: "Check-in de aula pelo aluno", status: "done" },
      { name: "Confirmar / Reagendar / Cancelar aula", status: "done" },
      { name: "Meus agendamentos no app do aluno", status: "done" },
      { name: "Solicitação de férias", status: "done" },
    ],
  },
  {
    id: "checkin", title: "Presença & Check-in", icon: FileText, color: "text-teal-500",
    features: [
      { name: "Quick Check-in na Home do aluno", status: "done" },
      { name: "Relatório de presença (admin)", status: "done" },
      { name: "Taxa de presença e contadores", status: "done" },
      { name: "Filtros por data e aluno", status: "done" },
    ],
  },
  {
    id: "payments", title: "Financeiro", icon: CreditCard, color: "text-emerald-500",
    features: [
      { name: "Registro de mensalidades", status: "done" },
      { name: "Status de pagamento", status: "done" },
      { name: "Histórico financeiro", status: "done" },
      { name: "Sistema de créditos para aulas", status: "done" },
      { name: "Alertas de vencimento", status: "done" },
      { name: "Integração gateway (Stripe)", status: "pending" },
    ],
  },
  {
    id: "reports", title: "Relatórios", icon: BarChart2, color: "text-indigo-500",
    features: [
      { name: "Lista de alunos com dados reais", status: "done" },
      { name: "Relatório de check-ins / presença", status: "done" },
      { name: "Gerador de relatórios", status: "done" },
      { name: "Exportação de dados", status: "done" },
    ],
  },
  {
    id: "notifications", title: "Notificações", icon: Bell, color: "text-yellow-500",
    features: [
      { name: "Notificação de cadastro WhatsApp", status: "done" },
      { name: "Notificação de novo treino", status: "done" },
      { name: "Push notifications", status: "pending" },
      { name: "Notificações in-app", status: "done" },
    ],
  },
  {
    id: "9fit-app", title: "App do Aluno (9FIT PRO)", icon: Smartphone, color: "text-primary",
    features: [
      { name: "Login/autenticação", status: "done" },
      { name: "Hub principal com treino do dia", status: "done" },
      { name: "Visualização de treinos HTML", status: "done" },
      { name: "Quick Check-in na Home", status: "done" },
      { name: "Tela de aulas (plano + agendamento + check-in)", status: "done" },
      { name: "Meus agendamentos", status: "done" },
      { name: "Perfil do usuário", status: "done" },
      { name: "Alterar senha no perfil", status: "done" },
      { name: "Onboarding contextual por feature", status: "done" },
      { name: "Estatísticas", status: "in_progress" },
      { name: "Dieta", status: "done" },
      { name: "Gamificação (XP/Níveis)", status: "in_progress" },
      { name: "Social/Comunidade", status: "pending" },
    ],
  },
  {
    id: "ai", title: "Inteligência Artificial", icon: Sparkles, color: "text-pink-500",
    features: [
      { name: "Geração de treino com IA", status: "done" },
      { name: "Análise de progresso", status: "done" },
      { name: "Recomendações personalizadas", status: "done" },
      { name: "Chat assistente", status: "done" },
    ],
  },
];

const statusConfig = {
  done: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Concluído" },
  in_progress: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Em Progresso" },
  pending: { icon: Circle, color: "text-gray-500", bg: "bg-gray-500/10", label: "Pendente" },
  blocked: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Bloqueado" },
};

export default function RoadmapPage() {
  const [expandedModules, setExpandedModules] = useState<string[]>(modules.map(m => m.id));
  const toggleModule = (id: string) => setExpandedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  const calculateProgress = (features: Feature[]) => Math.round((features.filter(f => f.status === "done").length / features.length) * 100);
  const totalFeatures = modules.reduce((acc, m) => acc + m.features.length, 0);
  const doneFeatures = modules.reduce((acc, m) => acc + m.features.filter(f => f.status === "done").length, 0);
  const inProgressFeatures = modules.reduce((acc, m) => acc + m.features.filter(f => f.status === "in_progress").length, 0);
  const overallProgress = Math.round((doneFeatures / totalFeatures) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Roadmap 9FIT PRO</h1>
        <p className="text-muted-foreground mt-1">Acompanhe o progresso do desenvolvimento</p>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{overallProgress}% Completo</h2>
              <p className="text-sm text-muted-foreground">{doneFeatures} de {totalFeatures} funcionalidades</p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full" /><span>{doneFeatures} Concluídos</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full" /><span>{inProgressFeatures} Em Progresso</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-500 rounded-full" /><span>{totalFeatures - doneFeatures - inProgressFeatures} Pendentes</span></div>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          const progress = calculateProgress(module.features);
          const isExpanded = expandedModules.includes(module.id);
          return (
            <Card key={module.id} className="overflow-hidden">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleModule(module.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-card border ${module.color}`}><Icon className="w-5 h-5" /></div>
                    <div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{module.features.filter(f => f.status === "done").length}/{module.features.length} concluídos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24"><Progress value={progress} className="h-2" /></div>
                    <Badge variant={progress === 100 ? "default" : "secondary"}>{progress}%</Badge>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="border-t">
                  <div className="space-y-2 pt-4">
                    {module.features.map((feature, idx) => {
                      const config = statusConfig[feature.status];
                      const StatusIcon = config.icon;
                      return (
                        <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${config.bg}`}>
                          <StatusIcon className={`w-5 h-5 ${config.color}`} />
                          <span className="flex-1 text-sm font-medium">{feature.name}</span>
                          <Badge variant="outline" className={`text-xs ${config.color} border-current`}>{config.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
