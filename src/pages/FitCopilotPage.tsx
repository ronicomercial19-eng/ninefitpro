import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FitCopilotPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">FitCopilot</h1>
          <p className="text-sm text-muted-foreground">Copiloto inteligente de treino</p>
        </div>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="py-16 text-center space-y-4">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto">
            <Bot className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Conecte a API para ativar</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            O FitCopilot monitora seus alunos em tempo real, sugere ajustes de carga,
            detecta padrões e recomenda intervenções automaticamente.
          </p>
          <Button variant="outline" disabled>
            <ExternalLink className="w-4 h-4 mr-2" /> Configurar API
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
