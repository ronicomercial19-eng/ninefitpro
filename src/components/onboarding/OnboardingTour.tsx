import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  X, 
  ArrowRight, 
  Users, 
  Dumbbell, 
  Calendar,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    href: string;
  };
}

const steps: OnboardingStep[] = [
  {
    title: "Bem-vindo ao 9FIT! 🎉",
    description: "Vamos fazer um tour rápido para você conhecer as principais funcionalidades da plataforma.",
    icon: <Sparkles className="w-12 h-12 text-primary" />
  },
  {
    title: "Gerencie Seus Alunos",
    description: "Adicione, edite e acompanhe o progresso de todos os seus alunos em um só lugar. Acesse medidas, fotos e histórico completo.",
    icon: <Users className="w-12 h-12 text-primary" />,
    action: {
      label: "Ver Alunos",
      href: "/app/alunos"
    }
  },
  {
    title: "Crie Treinos Personalizados",
    description: "Use nossa IA para gerar treinos científicos ou crie manualmente. Biblioteca com centenas de exercícios disponíveis.",
    icon: <Dumbbell className="w-12 h-12 text-primary" />,
    action: {
      label: "Treino IA",
      href: "/app/treino-ia"
    }
  },
  {
    title: "Agenda Inteligente",
    description: "Organize avaliações, consultas e acompanhamentos. Sincronize com seu calendário e nunca perca um compromisso.",
    icon: <Calendar className="w-12 h-12 text-primary" />,
    action: {
      label: "Ver Agenda",
      href: "/app/agenda"
    }
  },
  {
    title: "Análises e Relatórios",
    description: "Acompanhe estatísticas em tempo real, progresso dos alunos e gere relatórios detalhados para tomada de decisões.",
    icon: <TrendingUp className="w-12 h-12 text-primary" />,
    action: {
      label: "Ver Estatísticas",
      href: "/app/estatisticas"
    }
  }
];

export function OnboardingTour() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      // Delay para aparecer depois do carregamento da página
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setIsOpen(false);
  };

  const handleActionClick = () => {
    const action = steps[currentStep].action;
    if (action) {
      completeOnboarding();
      navigate(action.href);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="max-w-lg w-full shadow-2xl border-2 border-primary/20 animate-in zoom-in-95 duration-300">
        <CardContent className="p-8">
          {/* Close Button */}
          <button
            onClick={completeOnboarding}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Passo {currentStep + 1} de {steps.length}
            </p>
          </div>

          {/* Content */}
          <div className="text-center space-y-6">
            <div className="flex justify-center animate-in slide-in-from-top duration-500">
              {step.icon}
            </div>

            <div className="space-y-2 animate-in slide-in-from-bottom duration-500">
              <h2 className="text-2xl font-bold">{step.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Action Button */}
            {step.action && (
              <Button
                variant="outline"
                className="w-full group hover:border-primary hover:text-primary transition-all"
                onClick={handleActionClick}
              >
                {step.action.label}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="hover:bg-muted"
            >
              Voltar
            </Button>

            <Button
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Skip Button */}
          <div className="text-center mt-4">
            <button
              onClick={completeOnboarding}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular tour
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
