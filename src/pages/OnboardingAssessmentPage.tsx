import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { saveGuidedAssessment, GuidedAssessmentData } from '@/services/assessmentService';
import { useNavigate } from 'react-router-dom';

interface OnboardingAssessmentPageProps {
  athleteId: string;
  mode?: 'self' | 'professor'; // 'self' = aluno vindo do SSO, 'professor' = professor preenchendo
}

const steps = [
  { id: 1, label: 'Peso', field: 'peso', unit: 'kg', placeholder: 'ex: 75.5' },
  { id: 2, label: '% Gordura Corporal', field: 'gordura_corporal', unit: '%', placeholder: 'ex: 15.5' },
  { id: 3, label: 'Massa Muscular %', field: 'massa_muscular', unit: '%', placeholder: 'ex: 42.0' },
  { id: 4, label: '1RM Supino', field: 'rm1_empurrar_superior', unit: 'kg', placeholder: 'ex: 100' },
  { id: 5, label: '1RM Agachamento', field: 'rm1_empurrar_perna', unit: 'kg', placeholder: 'ex: 150' },
  { id: 6, label: '1RM Puxada', field: 'rm1_puxar_costas', unit: 'kg', placeholder: 'ex: 120' },
  { id: 7, label: 'Resumo & Salvar', field: 'review', unit: '', placeholder: '' },
];

export const OnboardingAssessmentPage: React.FC<OnboardingAssessmentPageProps> = ({
  athleteId,
  mode = 'self',
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<GuidedAssessmentData>>({
    peso: undefined,
    gordura_corporal: undefined,
    massa_muscular: undefined,
    rm1_empurrar_superior: undefined,
    rm1_empurrar_perna: undefined,
    rm1_puxar_costas: undefined,
  });

  const handleInputChange = (field: keyof GuidedAssessmentData, value: string) => {
    const numValue = parseFloat(value);
    setFormData(prev => ({
      ...prev,
      [field]: isNaN(numValue) ? undefined : numValue,
    }));
  };

  const isCurrentStepValid = (): boolean => {
    const step = steps[currentStep - 1];
    if (step.field === 'review') return true;
    const value = formData[step.field as keyof GuidedAssessmentData];
    return typeof value === 'number' && value > 0;
  };

  const handleNext = () => {
    if (isCurrentStepValid() && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const completeData: GuidedAssessmentData = {
        peso: formData.peso || 0,
        gordura_corporal: formData.gordura_corporal || 0,
        massa_muscular: formData.massa_muscular || 0,
        rm1_empurrar_superior: formData.rm1_empurrar_superior || 0,
        rm1_puxar_costas: formData.rm1_puxar_costas || 0,
        rm1_empurrar_perna: formData.rm1_empurrar_perna || 0,
        data_avaliacao: new Date().toISOString().split('T')[0],
      };

      await saveGuidedAssessment(athleteId, completeData);
      toast({
        title: 'Avaliação salva!',
        description: 'Seus dados foram registrados com sucesso.',
      });

      // Redirecionar para dashboard
      if (mode === 'self') {
        navigate('/');
      } else {
        navigate(`/professor/alunos/${athleteId}`);
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentStepData = steps[currentStep - 1];
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === 'self' ? 'Bem-vindo!' : 'Avaliação do Aluno'}
          </CardTitle>
          <CardDescription>
            {mode === 'self'
              ? 'Vamos começar coletando alguns dados básicos para personalizar sua experiência'
              : 'Preencha os dados de avaliação do aluno'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Passo {currentStep} de {steps.length}</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Conteúdo do step */}
          <div className="min-h-[200px] space-y-4">
            {currentStepData.field === 'review' ? (
              // Tela de revisão
              <div className="space-y-3 py-4">
                <h3 className="font-semibold text-lg">Revise seus dados:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground">Peso</p>
                    <p className="font-semibold">{formData.peso?.toFixed(1)} kg</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground">Gordura Corporal</p>
                    <p className="font-semibold">{formData.gordura_corporal?.toFixed(1)}%</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground">Massa Muscular</p>
                    <p className="font-semibold">{formData.massa_muscular?.toFixed(1)}%</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground">1RM Supino</p>
                    <p className="font-semibold">{formData.rm1_empurrar_superior?.toFixed(0)} kg</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground">1RM Agachamento</p>
                    <p className="font-semibold">{formData.rm1_empurrar_perna?.toFixed(0)} kg</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground">1RM Puxada</p>
                    <p className="font-semibold">{formData.rm1_puxar_costas?.toFixed(0)} kg</p>
                  </div>
                </div>
              </div>
            ) : (
              // Entrada de dados numéricos
              <div className="space-y-4 py-4">
                <Label htmlFor="value" className="text-base font-semibold">
                  {currentStepData.label}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="value"
                    type="number"
                    placeholder={currentStepData.placeholder}
                    value={formData[currentStepData.field as keyof GuidedAssessmentData] || ''}
                    onChange={(e) =>
                      handleInputChange(
                        currentStepData.field as keyof GuidedAssessmentData,
                        e.target.value
                      )
                    }
                    className="text-lg h-12"
                    step="0.1"
                  />
                  <span className="flex items-center px-4 text-lg font-semibold text-muted-foreground">
                    {currentStepData.unit}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Insira um valor numérico válido para continuar
                </p>
              </div>
            )}
          </div>

          {/* Botões de navegação */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1 || loading}
              className="flex-1"
            >
              Voltar
            </Button>
            {currentStep === steps.length ? (
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
                size="lg"
              >
                {loading ? 'Salvando...' : 'Concluir'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isCurrentStepValid() || loading}
                className="flex-1"
              >
                Próximo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingAssessmentPage;
