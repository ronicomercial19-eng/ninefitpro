import { useEffect, useState } from "react";
import { Atom, Network, Zap, GitBranch, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Connector {
  key: string;
  provider: string | null;
  status: string;
  endpoint: string | null;
  updated_at: string;
}

interface RegistryEvent {
  event_type: string;
  source: string;
  created_at: string;
}

// FIX (QA Fase D): NexusPage era 4 cards com status hardcoded no array NODES,
// sem nenhuma leitura de banco — "Frontend conectado. Endpoints externos do
// NEXUS serão plugados via API quando disponíveis" mentia que nada existia.
// A infra real (api_connectors, master_registry) já existe e já é usada pelo
// lado aluno (EcosystemGrid.tsx) — aqui só faltava o professor ler a mesma
// fonte de verdade.
export default function NexusPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [events, setEvents] = useState<RegistryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("nexus-master-registry")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "master_registry" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const load = async () => {
    const [{ data: conns }, { data: reg }] = await Promise.all([
      supabase.from("api_connectors").select("key, provider, status, endpoint, updated_at").order("key"),
      supabase.from("master_registry").select("event_type, source, created_at").order("created_at", { ascending: false }).limit(8),
    ]);
    setConnectors((conns as any) || []);
    setEvents((reg as any) || []);
    setLoading(false);
  };

  const activeCount = connectors.filter((c) => c.status === "active").length;
  const pendingCount = connectors.filter((c) => c.status !== "active").length;

  const summaryNodes = [
    { icon: Network, name: "Master Registry", detail: `${events.length} eventos recentes`, online: events.length > 0 },
    { icon: GitBranch, name: "Conectores Ativos", detail: `${activeCount}/${connectors.length} conectados`, online: activeCount > 0 },
    { icon: Zap, name: "Conectores Pendentes", detail: `${pendingCount} aguardando configuração`, online: pendingCount === 0 },
    { icon: Atom, name: "Predictive Engine", detail: "sem endpoint externo ainda", online: false },
  ];

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
        {summaryNodes.map((n) => (
          <Card key={n.name} className="border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <n.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-display uppercase">{n.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{loading ? "carregando..." : n.detail}</p>
              </div>
              <span className={`w-2 h-2 rounded-full ${n.online ? "bg-emerald-400 animate-pulse" : "bg-amber-400/70"}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-display uppercase tracking-widest text-muted-foreground mb-3">
            Conectores do ecossistema ({connectors.length})
          </p>
          <div className="space-y-1.5">
            {connectors.map((c) => (
              <div key={c.key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  {c.status === "active" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  )}
                  <span className="font-medium text-sm truncate">{c.provider || c.key}</span>
                  <span className="text-xs text-muted-foreground font-mono">{c.key}</span>
                </div>
                <Badge variant={c.status === "active" ? "default" : "outline"} className="text-[10px] flex-shrink-0">
                  {c.status === "active" ? "Conectado" : c.endpoint ? c.status : "Sem endpoint"}
                </Badge>
              </div>
            ))}
            {!loading && connectors.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum conector cadastrado.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-display uppercase tracking-widest text-muted-foreground mb-3">
            Últimos eventos no Master Registry
          </p>
          <div className="space-y-1.5">
            {events.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm">
                <span className="font-mono text-xs">{e.event_type}</span>
                <span className="text-xs text-muted-foreground">
                  {e.source} · {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            ))}
            {!loading && events.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
