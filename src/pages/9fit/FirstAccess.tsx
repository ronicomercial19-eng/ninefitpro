import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Shield,
  CheckCircle2,
  Dumbbell,
  Utensils,
  Calendar,
  User,
  Sparkles
} from "lucide-react";

type Step = 'welcome' | 'password' | 'tour-training' | 'tour-diet' | 'tour-classes' | 'tour-profile' | 'complete';

export default function FirstAccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('welcome');
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [athleteName, setAthleteName] = useState("");

  useEffect(() => {
    const fetchAthleteData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get name from user metadata or athlete table
        const name = user.user_metadata?.full_name || 
                     user.user_metadata?.name ||
                     user.email?.split('@')[0] || 
                     'Atleta';
        setAthleteName(name);
      }
    };
    fetchAthleteData();
  }, []);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "Digite a mesma senha nos dois campos",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Update password_changed flag in athletes table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: link } = await supabase
          .from('athlete_auth_link')
          .select('athlete_id')
          .eq('user_id', user.id)
          .single();

        if (link) {
          await supabase
            .from('athletes')
            .update({ password_changed: true })
            .eq('id', link.athlete_id);
        }
      }

      toast({
        title: "Senha alterada!",
        description: "Sua nova senha foi salva com sucesso",
      });
      
      setStep('tour-training');
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tourSteps = [
    {
      id: 'tour-training',
      icon: Dumbbell,
      title: 'Seus Treinos',
      description: 'Acesse seus treinos personalizados criados pelo seu professor. Veja exercícios, séries, repetições e vídeos demonstrativos.',
      nextStep: 'tour-diet' as Step,
    },
    {
      id: 'tour-diet',
      icon: Utensils,
      title: 'Sua Dieta',
      description: 'Acompanhe seu plano alimentar com refeições detalhadas, horários e dicas nutricionais para maximizar seus resultados.',
      nextStep: 'tour-classes' as Step,
    },
    {
      id: 'tour-classes',
      icon: Calendar,
      title: 'Aulas & Agenda',
      description: 'Reserve aulas ao vivo, veja horários disponíveis e gerencie seus agendamentos com facilidade.',
      nextStep: 'tour-profile' as Step,
    },
    {
      id: 'tour-profile',
      icon: User,
      title: 'Seu Perfil',
      description: 'Atualize seus dados, acompanhe seu progresso e visualize suas estatísticas de evolução.',
      nextStep: 'complete' as Step,
    },
  ];

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="animate-fade-in text-center space-y-8">
            <div className="relative">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
            </div>
            
            <div>
              <h1 className="text-3xl font-black italic tracking-tight text-foreground mb-2">
                Bem-vindo, {athleteName}!
              </h1>
              <p className="text-muted-foreground">
                Este é seu primeiro acesso ao 9FIT PRO
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 text-left space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Segurança em Primeiro Lugar
              </h3>
              <p className="text-sm text-muted-foreground">
                Por segurança, você precisa criar uma nova senha pessoal. 
                Depois vamos fazer um tour rápido pelo app.
              </p>
            </div>

            <button
              onClick={() => setStep('password')}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              Continuar
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        );

      case 'password':
        return (
          <div className="animate-fade-in space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Crie sua Nova Senha
              </h2>
              <p className="text-muted-foreground text-sm mt-2">
                Escolha uma senha segura que você vai lembrar
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha"
                  className="w-full bg-card border border-border rounded-lg pl-12 pr-12 py-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a senha"
                  className="w-full bg-card border border-border rounded-lg pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              {newPassword && confirmPassword && (
                <div className={`flex items-center gap-2 text-sm ${
                  newPassword === confirmPassword ? 'text-green-500' : 'text-red-500'
                }`}>
                  {newPassword === confirmPassword ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Senhas conferem
                    </>
                  ) : (
                    'Senhas não conferem'
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handlePasswordChange}
              disabled={isLoading || !newPassword || newPassword !== confirmPassword}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <span className="animate-pulse">Salvando...</span>
              ) : (
                <>
                  Salvar e Continuar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        );

      case 'tour-training':
      case 'tour-diet':
      case 'tour-classes':
      case 'tour-profile':
        const currentTour = tourSteps.find(t => t.id === step);
        if (!currentTour) return null;
        
        const currentIndex = tourSteps.findIndex(t => t.id === step);
        const Icon = currentTour.icon;

        return (
          <div className="animate-fade-in text-center space-y-8">
            {/* Progress dots */}
            <div className="flex justify-center gap-2">
              {tourSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx <= currentIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="relative">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Icon className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {currentTour.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {currentTour.description}
              </p>
            </div>

            <button
              onClick={() => setStep(currentTour.nextStep)}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              {currentTour.nextStep === 'complete' ? 'Começar!' : 'Próximo'}
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep('complete')}
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Pular tour
            </button>
          </div>
        );

      case 'complete':
        return (
          <div className="animate-fade-in text-center space-y-8">
            <div className="relative">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Tudo Pronto!
              </h2>
              <p className="text-muted-foreground">
                Seu perfil está configurado. Hora de treinar! 💪
              </p>
            </div>

            <button
              onClick={() => navigate('/9fit/hub')}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all animate-pulse hover:animate-none"
            >
              Acessar Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {renderStep()}
      </div>
    </div>
  );
}
