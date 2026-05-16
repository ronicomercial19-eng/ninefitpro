import { Atom, Network, Zap, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const NODES = [
  { icon: Network, name: "Master Registry", status: "operacional" },
  { icon: GitBranch, name: "Supra Hub", status: "operacional" },
  { icon: Zap, name: "Smart Notifications", status: "operacional" },
  { icon: Atom, name: "Predictive Engine", status: "ativo" },
];

export default function NexusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase tracking-tight flex items-center gap-3">
          <Atom className="w-7 h-7 text-primary" /> NEXUS
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Núcleo de orquestração do ecossistema 9FIT — agentes, registros e fluxos cruzados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {NODES.map((n) => (
          <Card key={n.name} className="border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <n.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-display uppercase">{n.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{n.status}</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-primary glow-neon" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Frontend conectado. Endpoints externos do NEXUS serão plugados via API quando disponíveis.
        </CardContent>
      </Card>
    </div>
  );
}
