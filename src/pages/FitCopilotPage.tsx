import React from 'react';
import { Bot } from 'lucide-react';
import { ApiConnectorCard } from '@/components/admin/ApiConnectorCard';

export default function FitCopilotPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">FitCopilot</h1>
          <p className="text-sm text-muted-foreground">Copiloto inteligente de treino via API</p>
        </div>
      </div>
      <ApiConnectorCard
        moduleKey="fit_copilot"
        title="FitCopilot API"
        description="Monitoramento em tempo real, ajustes de carga e detecção de padrões."
        icon={Bot}
        endpointPlaceholder="https://api.fitcopilot.example.com/v1"
      />
    </div>
  );
}
