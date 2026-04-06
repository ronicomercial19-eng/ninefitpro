import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SmartPeriodizer() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">SmartPeriodizer</h1>
          <p className="text-sm text-muted-foreground">Periodização inteligente automatizada</p>
        </div>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="py-16 text-center space-y-4">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Conecte a API para ativar</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            O SmartPeriodizer gera periodizações automatizadas baseadas no perfil do aluno,
            ajustando volume, intensidade e recuperação de forma inteligente.
          </p>
          <Button variant="outline" disabled>
            <ExternalLink className="w-4 h-4 mr-2" /> Configurar API
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
