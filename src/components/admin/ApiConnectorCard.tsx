import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Cpu, Plug, RefreshCw, CheckCircle2, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface Props {
  moduleKey: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  endpointPlaceholder?: string;
  docsUrl?: string;
  onSync?: (apiKey: string, endpoint?: string) => Promise<void> | void;
}

/**
 * Generic UI to register an external API key + endpoint for an integration module.
 * Persists in localStorage (`9fit.api.${moduleKey}`) and exposes a sync action.
 */
export function ApiConnectorCard({
  moduleKey,
  title,
  description,
  icon: Icon = Plug,
  endpointPlaceholder,
  docsUrl,
  onSync,
}: Props) {
  const storageKey = `9fit.api.${moduleKey}`;
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        setApiKey(p.apiKey || "");
        setEndpoint(p.endpoint || "");
        setConnected(!!p.apiKey);
        setLastSync(p.lastSync || null);
      }
    } catch {}
  }, [storageKey]);

  const save = () => {
    if (!apiKey.trim()) { toast.error("Informe a API Key"); return; }
    localStorage.setItem(
      storageKey,
      JSON.stringify({ apiKey, endpoint, lastSync, savedAt: new Date().toISOString() })
    );
    setConnected(true);
    toast.success(`${title} conectado`);
  };

  const sync = async () => {
    if (!connected) { toast.error("Conecte primeiro"); return; }
    setSyncing(true);
    try {
      if (onSync) await onSync(apiKey, endpoint || undefined);
      const ts = new Date().toISOString();
      setLastSync(ts);
      localStorage.setItem(storageKey, JSON.stringify({ apiKey, endpoint, lastSync: ts }));
      toast.success("Sincronizado");
    } catch (e: any) {
      toast.error(e?.message || "Falha na sincronização");
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem(storageKey);
    setApiKey(""); setEndpoint(""); setConnected(false); setLastSync(null);
    toast.info("Desconectado");
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-display uppercase tracking-tight">{title}</h2>
              <p className="text-xs text-muted-foreground max-w-md">{description}</p>
            </div>
          </div>
          {connected ? (
            <Badge className="bg-primary/15 text-primary border-primary/30">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Aguardando API
            </Badge>
          )}
        </div>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest flex items-center gap-1.5">
              <KeyRound className="w-3 h-3" /> API Key
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          {endpointPlaceholder && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">Endpoint</Label>
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={endpointPlaceholder}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={save} variant={connected ? "outline" : "default"}>
            <Plug className="w-4 h-4 mr-2" />
            {connected ? "Atualizar" : "Conectar"}
          </Button>
          <Button onClick={sync} disabled={!connected || syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          {connected && (
            <Button variant="ghost" onClick={disconnect} className="text-muted-foreground">
              Desconectar
            </Button>
          )}
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline ml-auto"
            >
              Docs da API
            </a>
          )}
        </div>

        {lastSync && (
          <p className="text-[10px] font-mono text-muted-foreground">
            Última sincronização: {new Date(lastSync).toLocaleString("pt-BR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
