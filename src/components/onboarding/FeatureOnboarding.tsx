import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingStep {
  title: string;
  description: string;
  emoji: string;
}

const FEATURE_STEPS: Record<string, OnboardingStep[]> = {
  hub: [
    { emoji: "🏠", title: "Seu Hub Central", description: "Aqui você vê seu treino do dia, progresso e status geral." },
    { emoji: "🔥", title: "Missões & Calorias", description: "Complete treinos e missões para acumular calorias e manter sua sequência." },
  ],
  aulas: [
    { emoji: "📅", title: "Agende suas Aulas", description: "Selecione uma data no calendário para ver aulas disponíveis e agendar." },
    { emoji: "✅", title: "Check-in", description: "No dia da aula, confirme sua presença clicando em 'Confirmar'." },
    { emoji: "🔄", title: "Reagendar", description: "Precisa trocar? Cancele e escolha outro horário." },
  ],
  exercises: [
    { emoji: "💪", title: "Biblioteca de Exercícios", description: "Explore e filtre exercícios por músculo, equipamento e objetivo." },
    { emoji: "🎥", title: "Vídeos Demonstrativos", description: "Clique no play para ver a execução correta de cada exercício." },
  ],
  agenda: [
    { emoji: "📋", title: "Gerencie Agendamentos", description: "Crie avaliações, aulas e consultorias para seus alunos." },
    { emoji: "🎨", title: "Cores por Tipo", description: "Roxo = Avaliação, Azul = Aula, Verde = Consultoria." },
    { emoji: "📆", title: "Multi-Dia", description: "Ao criar agendamento, marque 'Múltiplos dias' para agendar vários dias da semana de uma vez." },
  ],
  training: [
    { emoji: "📄", title: "Atribua Treinos", description: "Faça upload de HTML, cole links ou use a IA para criar treinos." },
    { emoji: "👁️", title: "Visualize & Edite", description: "Clique no olho para preview ou no lápis para editar templates." },
  ],
  profile: [
    { emoji: "🔐", title: "Altere sua Senha", description: "Na seção Segurança, clique em 'Alterar Senha' para definir uma nova." },
  ],
};

interface FeatureOnboardingProps {
  featureKey: string;
}

export function FeatureOnboarding({ featureKey }: FeatureOnboardingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const storageKey = `onboarding_${featureKey}_seen`;

  const steps = FEATURE_STEPS[featureKey] || [];

  useEffect(() => {
    if (steps.length === 0) return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setTimeout(() => setIsOpen(true), 800);
    }
  }, [storageKey, steps.length]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else handleDismiss();
  };

  if (!isOpen) return null;

  const current = steps[step];

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom duration-300">
      <div className="bg-card border-2 border-primary/30 rounded-xl shadow-2xl p-5 relative">
        <button onClick={handleDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl">{current.emoji}</span>
          <div>
            <h4 className="font-bold text-foreground text-sm">{current.title}</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{current.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs">Pular</Button>
            <Button size="sm" onClick={handleNext} className="text-xs">
              {step < steps.length - 1 ? 'Próximo' : 'Entendi!'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
