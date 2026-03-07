import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  X, Users, Dumbbell, Calendar, TrendingUp, Sparkles, Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OnboardingStep {
  title: string;
  description: string;
  emoji: string;
  icon: React.ReactNode;
  action?: { label: string; href: string; };
}

const steps: OnboardingStep[] = [
  {
    title: "Bem-vindo ao 9FIT!",
    description: "Tour rápido das principais funcionalidades. Vamos lá!",
    emoji: "🎉",
    icon: <Sparkles className="w-10 h-10 text-primary" />
  },
  {
    title: "Seus Alunos",
    description: "Adicione, edite e acompanhe o progresso de cada aluno.",
    emoji: "👥",
    icon: <Users className="w-10 h-10 text-primary" />,
    action: { label: "Ver Alunos", href: "/app/alunos" }
  },
  {
    title: "Treinos",
    description: "Crie treinos com IA ou faça upload de HTML. Biblioteca com exercícios.",
    emoji: "💪",
    icon: <Dumbbell className="w-10 h-10 text-primary" />,
    action: { label: "Treino IA", href: "/app/treino-ia" }
  },
  {
    title: "Agenda",
    description: "Agende avaliações, aulas e consultorias. Multi-dia disponível!",
    emoji: "📅",
    icon: <Calendar className="w-10 h-10 text-primary" />,
    action: { label: "Ver Agenda", href: "/app/agenda" }
  },
  {
    title: "Relatórios",
    description: "Estatísticas, presença e progresso dos alunos em tempo real.",
    emoji: "📊",
    icon: <TrendingUp className="w-10 h-10 text-primary" />,
    action: { label: "Ver Estatísticas", href: "/app/estatisticas" }
  }
];

export function OnboardingTour() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else completeOnboarding();
  };

  const completeOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setIsOpen(false);
  };

  const handleActionClick = () => {
    const action = steps[currentStep].action;
    if (action) { completeOnboarding(); navigate(action.href); }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="max-w-md w-full shadow-2xl border-2 border-primary/20 animate-in zoom-in-95 duration-300">
        <CardContent className="p-6 relative">
          <button onClick={completeOnboarding} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>

          {/* Progress */}
          <div className="mb-5">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center uppercase tracking-wider">
              {currentStep + 1} de {steps.length}
            </p>
          </div>

          {/* Content */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <span className="text-5xl">{step.emoji}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{step.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
            </div>

            {step.action && (
              <Button variant="outline" className="w-full group hover:border-primary hover:text-primary" onClick={handleActionClick}>
                {step.action.label}
                <Zap className="w-4 h-4 ml-2 group-hover:text-primary" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)} disabled={currentStep === 0} className="text-sm">
              Voltar
            </Button>
            <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 text-sm">
              {currentStep === steps.length - 1 ? 'Entendi!' : 'Próximo'}
            </Button>
          </div>

          <div className="text-center mt-3">
            <button onClick={completeOnboarding} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Pular tour
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
