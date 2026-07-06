import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Activity, TrendingUp, Calendar } from 'lucide-react';

const AssessmentSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    // Trigger animation após montar
    setTimeout(() => setIsAnimated(true), 100);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div
          className={`text-center space-y-3 transition-all duration-700 ${
            isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Boas-vindas ao 9FitPro!</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Para personalizarmos sua experiência, precisamos conhecer seus dados básicos de performance.
          </p>
        </div>

        {/* Grid de informações */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-700 delay-100 ${
            isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Composição Corporal</h3>
                  <p className="text-sm text-muted-foreground">
                    Peso, % de gordura e massa muscular
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Força Máxima</h3>
                  <p className="text-sm text-muted-foreground">
                    1RM em supino, agachamento e puxada
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div
          className={`grid grid-cols-3 gap-4 transition-all duration-700 delay-200 ${
            isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Card className="bg-muted/50 border-0">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">6</p>
              <p className="text-xs text-muted-foreground mt-1">Dados coletados</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50 border-0">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">~2min</p>
              <p className="text-xs text-muted-foreground mt-1">Tempo estimado</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50 border-0">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">∞</p>
              <p className="text-xs text-muted-foreground mt-1">Personalização</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Button */}
        <div
          className={`pt-4 transition-all duration-700 delay-300 ${
            isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Button
            onClick={() => navigate('/avaliacao-guiada/minha-avaliacao')}
            size="lg"
            className="w-full h-12 text-base font-semibold group"
          >
            Começar Avaliação
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Seus dados são protegidos e usados apenas para personalizar sua experiência
          </p>
        </div>

        {/* Footer info */}
        <div
          className={`text-center text-xs text-muted-foreground space-y-1 transition-all duration-700 delay-400 ${
            isAnimated ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p>💡 Você poderá atualizar esses dados a qualquer momento</p>
          <p>📊 Seu histórico de performance fica salvo para análise</p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentSelectionPage;
