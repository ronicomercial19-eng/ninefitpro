import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plug,
  RefreshCw,
  CheckCircle2,
  KeyRound,
  Loader2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ConnectorConfig {
  apikey_hint?: string;
  last_sync?: string;
}

interface ConnectorPayload {
  key: string;
  provider: string;
  auth_mode: string;
  endpoint: string | null;
  iframe_url: string | null;
  status: "active";
  secret_ref?: string;
  config: ConnectorConfig;
}

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
function AdminApiConnectorCard(props: Props) {
  const {
    moduleKey,
    title,
    description,
    healthPath = "/health",
    icon: Icon = Plug,
    endpointPlaceholder,
    docsUrl,
    provider,
    authMode = "apikey",
    onSync,
  } = props;
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probeStatus, setProbeStatus] = useState<"unknown" | "ok" | "fail">(
    "unknown",
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_connectors")
      .select("*")
      .eq("key", moduleKey)
      .maybeSingle();
    if (error)
      toast.error("Não foi possível carregar a configuração do conector.");
    if (data) {
      setEndpoint(data.endpoint ?? "");
      setIframeUrl(data.iframe_url ?? "");
      setConnected(data.status === "active");
      setUpdatedAt(data.updated_at);
      // never re-show secret; only hint
      const config =
        data.config &&
        typeof data.config === "object" &&
        !Array.isArray(data.config)
          ? (data.config as ConnectorConfig)
          : null;
      const hint = config?.apikey_hint;
      if (hint) setApiKey(`••••${hint}`);
    }
    setLoading(false);
  }, [moduleKey]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const clean = apiKey.startsWith("••••") ? null : apiKey.trim();
    if (authMode === "apikey" && !clean && !connected) {
      toast.error("Informe a API Key");
      return;
    }
    const hint = clean
      ? clean.slice(-4)
      : apiKey.startsWith("••••")
        ? apiKey.slice(-4)
        : null;
    const { data, error } = await supabase.rpc("fn_save_api_connector" as any, {
      p_key: moduleKey,
      p_provider: provider ?? moduleKey,
      p_endpoint: endpoint.trim() || null,
      p_auth_mode: authMode,
      p_iframe_url: iframeUrl.trim() || null,
      p_api_key: clean,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!(data as any)?.saved) {
      toast.error("Configuração não confirmada.");
      return;
    }
    setProbeStatus("unknown");
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
      const { data, error } = await supabase.functions.invoke(
        "api-connector-proxy",
        {
          body: {
            connector: moduleKey,
            path: healthPath,
            init: { method: "GET" },
          },
        },
      );
      if (error || data?.verified !== true)
        throw error || new Error("Validação não confirmada.");
      setProbeStatus("ok");
      toast.success("Endpoint respondeu com JSON válido.");
    } catch (e: unknown) {
      setProbeStatus("fail");
      toast.warning("Endpoint não respondeu — verifique credenciais");
    } finally {
      setProbing(false);
    }
  };

  const disconnect = async () => {
    const { error } = await supabase
      .from("api_connectors")
      .update({ status: "inactive" })
      .eq("key", moduleKey)
      .select("key")
      .single();
    if (error) {
      toast.error("Não foi possível confirmar a desconexão.");
      return;
    }
    setProbeStatus("unknown");
    setConnected(false);
    setApiKey("");
    toast.info("Desconectado");
    load();
  };

  const sync = async () => {
    if (!onSync) {
      toast.error(
        "Este módulo não possui operação de sincronização configurada.",
      );
      return;
    }
    if (!connected) {
      toast.error("Conecte primeiro");
      return;
    }
    setSyncing(true);
    try {
      if (onSync) await onSync(apiKey, endpoint || undefined);
      const { error: receiptError } = await supabase
        .from("api_connectors")
        .update({
          config: {
            apikey_hint: apiKey.slice(-4),
            last_sync: new Date().toISOString(),
          },
        })
        .eq("key", moduleKey)
        .select("key")
        .single();
      if (receiptError) throw receiptError;
      toast.success("Sincronizado");
      load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha na sincronização";
      toast.error(message);
    } finally {
      setSyncing(false);
    }
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
              <h2 className="text-lg font-display uppercase tracking-tight">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground max-w-md">
                {description}
              </p>
            </div>
          </div>
          {loading ? (
            <Badge variant="outline">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Carregando
            </Badge>
          ) : connected ? (
            <Badge className="bg-primary/15 text-primary border-primary/30">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Configurado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Aguardando API
            </Badge>
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
          {authMode !== "iframe_sso" && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">
                Endpoint
              </Label>
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={endpointPlaceholder || "https://api.exemplo.com"}
              />
            </div>
          )}
          {authMode === "iframe_sso" && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">
                Iframe URL
              </Label>
              <Input
                value={iframeUrl}
                onChange={(e) => setIframeUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={save} variant={connected ? "outline" : "default"}>
            <Plug className="w-4 h-4 mr-2" />
            {connected ? "Atualizar" : "Conectar"}
          </Button>
          <Button onClick={sync} disabled={!onSync || !connected || syncing}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            Sincronizar
          </Button>
          {connected && (
            <Button
              variant="outline"
              onClick={probe}
              disabled={probing}
              className="text-primary"
            >
              <Activity
                className={`w-4 h-4 mr-2 ${probing ? "animate-pulse" : ""}`}
              />
              Validar
            </Button>
          )}
          {probeStatus === "ok" && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Resposta verificada
            </Badge>
          )}
          {probeStatus === "fail" && (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
              <AlertTriangle className="w-3 h-3 mr-1" /> Sem resposta
            </Badge>
          )}
          {connected && (
            <Button
              variant="ghost"
              onClick={disconnect}
              className="text-muted-foreground"
            >
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

        {updatedAt && (
          <p className="text-[10px] font-mono text-muted-foreground">
            Atualizado: {new Date(updatedAt).toLocaleString("pt-BR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ApiConnectorCard(props: Props) {
  const { isAdmin, user } = useAuth();
  const query = useQuery({
    queryKey: ["connector-summary", user?.id, props.moduleKey],
    enabled: !!user && !isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_connectors")
        .select("status,updated_at")
        .eq("key", props.moduleKey)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isAdmin) return <AdminApiConnectorCard {...props} />;
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold">{props.title}</h3>
        <p className="text-sm text-muted-foreground">
          {query.isLoading
            ? "Consultando configuração…"
            : query.isError
              ? "Não foi possível consultar a configuração."
              : query.data?.status === "active"
                ? "Destino configurado. A disponibilidade depende de uma operação confirmada."
                : "Integração externa não configurada. As ferramentas nativas continuam disponíveis."}
        </p>
        <p className="text-xs text-muted-foreground">
          Configuração de provedores e credenciais é responsabilidade da
          administração.
        </p>
      </CardContent>
    </Card>
  );
}
