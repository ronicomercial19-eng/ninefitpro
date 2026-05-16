import { Film } from "lucide-react";
import { ApiConnectorCard } from "@/components/admin/ApiConnectorCard";

export default function HealthFlixAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase tracking-tight flex items-center gap-3">
          <Film className="w-7 h-7 text-primary" /> HealthFlix
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Streaming de aulas e conteúdo — pronto para inserir a API e sincronizar.
        </p>
      </div>
      <ApiConnectorCard
        moduleKey="healthflix"
        title="HealthFlix API"
        description="Conecte a API do HealthFlix para sincronizar o catálogo de vídeos automaticamente."
        endpointPlaceholder="https://api.healthflix.example.com/v1"
      />
    </div>
  );
}
