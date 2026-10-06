import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { finalizeFirstAccess } from "@/lib/firstAccess";
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
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordUpdated(true);
      setNewPassword('');
      setConfirmPassword('');
      await runFinalize();
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

  const runFinalize = async () => {
    setIsLoading(true);
    setFinalizeError(null);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Sua sessão expirou. Entre novamente para concluir.');
      let store: Storage | undefined;
      try { store = localStorage; } catch { /* Optional storage. */ }
      await finalizeFirstAccess({
        rpc: () => supabase.rpc('complete_first_access'),
        refreshSession: () => supabase.auth.refreshSession(),
      }, user.id, store);
      setStep('tour-training');
    } catch {
      setFinalizeError('Sua senha foi salva. Não foi possível concluir seu acesso; tente finalizar novamente.');
    } finally { setIsLoading(false); }
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
        if (passwordUpdated) return (
          <div className="text-center space-y-6" role="status">
            <h2 className="text-2xl font-bold">Sua senha foi salva</h2>
            <p>{finalizeError || 'Finalizando seu acesso…'}</p>
            <button disabled={isLoading} onClick={() => void runFinalize()} className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-lg disabled:opacity-50">
              {isLoading ? 'Finalizando…' : 'Tentar finalizar novamente'}
            </button>
            <button onClick={() => navigate('/9fit/login', { replace: true })} className="text-sm underline">Entrar novamente</button>
          </div>
        );
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
       …3432 tokens truncated…      >
            <Chrome className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Google</span>
          </button>
        </div>

        {/* Sign Up Link */}
        <p className="text-center mt-8 text-muted-foreground text-sm">
          Novo por aqui?{" "}
          <button
            onClick={() => navigate("/auth")}
            className="text-primary hover:text-foreground transition-colors"
          >
            Criar conta
          </button>
        </p>
      </div>
    </div>
  );
}
