import React from 'react';
import { Calendar } from 'lucide-react';
import { ApiConnectorCard } from '@/components/admin/ApiConnectorCard';

export default function SmartPeriodizer() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">SmartPeriodizer</h1>
          <p className="text-sm text-muted-foreground">Periodização inteligente via API</p>
        </div>
      </div>
      <ApiConnectorCard
        moduleKey="smart_periodizer"
        title="SmartPeriodizer API"
        description="Conecte para gerar periodizações automatizadas (volume, intensidade, recuperação)."
        icon={Calendar}
        endpointPlaceholder="https://api.smartperiodizer.example.com/v1"
      />
    </div>
  );
}
