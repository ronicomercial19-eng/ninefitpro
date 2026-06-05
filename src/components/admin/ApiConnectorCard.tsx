import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plug, RefreshCw, CheckCircle2, KeyRound, Loader2, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  moduleKey: string;
  title: string;
  description: string;
  /** Path relativo para validar conexão (default: /health) */
  healthPath?: string;
  icon?: React.ComponentType<{ className?: string }>;
  endpointPlaceholder?: string;
  docsUrl?: string;
  provider?: string;
  authMode?: "none" | "apikey" | "oauth" | "iframe_sso";
  onSync?: (apiKey: string, endpoint?: string) => Promise<void> | void;
}

/**
 * Registra / atualiza um connector na tabela `api_connectors`.
 * Secret nunca é exposto: persistimos apenas `secret_ref` (chave lógica)
 * e o último resumo em `config.apikey_hint`.
 */
export function ApiConnectorCard({
  moduleKey,
  title,
  description,
  icon: Icon = Plug,
  endpointPlaceholder,
  docsUrl,
  provider,
  authMode = "apikey",
  onSync,
}: Props) {
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [moduleKey]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("api_connectors")
      .select("*")
      .eq("key", moduleKey)
      .maybeSingle();
    if (data) {
      setEndpoint(data.endpoint ?? "");
      setIframeUrl(data.iframe_url ?? "");
      setConnected(data.status === "active");
      setUpdatedAt(data.updated_at);
      // never re-show secret; only hint
      const hint = (data.config as any)?.apikey_hint;
      if (hint) setApiKey(`••••${hint}`);
    }
    setLoading(false);
  }

  const save = async () => {
    const clean = apiKey.startsWith("••••") ? null : apiKey.trim();
    if (authMode === "apikey" && !clean && !connected) {
      toast.error("Informe a API Key"); return;
    }
    const hint = clean ? clean.slice(-4) : (apiKey.startsWith("••••") ? apiKey.slice(-4) : null);
    const payload: any = {
      key: moduleKey,
      provider: provider ?? moduleKey,
      auth_mode: authMode,
      endpoint: endpoint || null,
      iframe_url: iframeUrl || null,
      status: "active",
      secret_ref: clean ? `${moduleKey}:${Date.now()}` : undefined,
      config: { apikey_hint: hint },
    };
    const { error } = await supabase
      .from("api_connectors")
      .upsert(payload, { onConflict: "key" });
    if (error) { toast.error(error.message); return; }
    toast.success(`${title} salvo. Validando...`);
    setConnected(true);
    if (clean) setApiKey(`••••${hint}`);
    // Probe automaticamente após salvar
    await probe();
    load();
  };

  const probe = async () => {
    setProbing(true);
    try {
      const { data, error } = await supabase.functions.invoke("api-connector-proxy", {
        body: { connector: moduleKey, path: (props as any).healthPath ?? "/health", init: { method: "GET" } },
      });
      if (error) throw error;
      setProbeStatus("ok");
      toast.success("Conexão validada ✓");
    } catch (e: any) {
      setProbeStatus("fail");
      toast.warning("Endpoint não respondeu — verifique credenciais");
    } finally {
      setProbing(false);
    }
  };

  const disconnect = async () => {
    await supabase.from("api_connectors").update({ status: "inactive" }).eq("key", moduleKey);
    setConnected(false);
    setApiKey("");
    toast.info("Desconectado");
    load();
  };

  const sync = async () => {
    if (!connected) { toast.error("Conecte primeiro"); return; }
    setSyncing(true);
    try {
      if (onSync) await onSync(apiKey, endpoint || undefined);
      await supabase.from("api_connectors")
        .update({ config: { apikey_hint: apiKey.slice(-4), last_sync: new Date().toISOString() } })
        .eq("key", moduleKey);
      toast.success("Sincronizado");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Falha na sincronização");
    } finally { setSyncing(false); }
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
          {loading ? (
            <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Carregando</Badge>
          ) : connected ? (
            <Badge className="bg-primary/15 text-primary border-primary/30">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Aguardando API</Badge>
          )}
        </div>

        <div className="grid gap-3">
          {authMode === "apikey" && (
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
          )}
          {endpointPlaceholder && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">Endpoint</Label>
              <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder={endpointPlaceholder} />
            </div>
          )}
          {authMode === "iframe_sso" && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">Iframe URL</Label>
              <Input value={iframeUrl} onChange={(e) => setIframeUrl(e.target.value)} placeholder="https://..." />
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
            <Button variant="ghost" onClick={disconnect} className="text-muted-foreground">Desconectar</Button>
          )}
          {docsUrl && (
            <a href={docsUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline ml-auto">
              Docs da API
            </a>
          )}
        </div>

        {updatedAt && (
          <p className="text-[10px] font-mono text-muted-foreground">
            Atualizado: {new Date(updatedAt).toLocaleString("pt-BR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
