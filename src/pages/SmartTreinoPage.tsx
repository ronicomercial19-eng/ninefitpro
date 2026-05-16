import React from 'react';
import { Zap } from 'lucide-react';
import { ApiConnectorCard } from '@/components/admin/ApiConnectorCard';

export default function SmartTreinoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">SmartTreino</h1>
          <p className="text-sm text-muted-foreground">Montagem inteligente de treinos via API</p>
        </div>
      </div>
      <ApiConnectorCard
        moduleKey="smart_treino"
        title="SmartTreino API"
        description="Conecte o motor SmartTreino para gerar séries/super-séries de referência automaticamente."
        icon={Zap}
        endpointPlaceholder="https://api.smarttreino.example.com/v1"
      />
    </div>
  );
}
