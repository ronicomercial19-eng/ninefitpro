import { Activity, ScanLine } from "lucide-react";
import { ApiConnectorCard } from "@/components/admin/ApiConnectorCard";

export default function PosturaProPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase tracking-tight flex items-center gap-3">
          <Activity className="w-7 h-7 text-primary" /> Postura Pro Analyzer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Análise postural assistida — pronto para inserir a API e sincronizar.
        </p>
      </div>
      <ApiConnectorCard
        moduleKey="postura_pro"
        title="Postura Pro Analyzer"
        description="Conecte o serviço externo de análise postural para receber laudos automáticos no painel."
        icon={ScanLine}
        endpointPlaceholder="https://api.posturapro.example.com/v1"
      />
    </div>
  );
}
