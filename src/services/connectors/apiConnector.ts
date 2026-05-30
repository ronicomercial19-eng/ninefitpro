/**
 * API Connector universal — fábrica que dado um registro `api_connectors`
 * devolve { fetch, openIframe, sso }. Nunca expõe API keys ao client:
 * requests `apikey` passam pela edge function `api-connector-proxy`.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ConnectorRecord {
  id: string;
  key: string;
  provider: string;
  endpoint: string | null;
  auth_mode: "none" | "apikey" | "oauth" | "iframe_sso";
  iframe_url: string | null;
  permissions: string[];
  status: string;
  config: Record<string, any>;
}

const cache = new Map<string, ConnectorRecord>();

export async function getConnector(key: string): Promise<ConnectorRecord | null> {
  if (cache.has(key)) return cache.get(key)!;
  const { data, error } = await supabase
    .from("api_connectors")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  cache.set(key, data as ConnectorRecord);
  return data as ConnectorRecord;
}

export function invalidateConnector(key?: string) {
  if (key) cache.delete(key); else cache.clear();
}

export async function apiConnector(key: string) {
  const rec = await getConnector(key);
  if (!rec) throw new Error(`Connector "${key}" não cadastrado`);

  async function authedFetch(path: string, init: RequestInit = {}) {
    if (rec!.status !== "active") {
      throw new Error(`Connector "${key}" inativo (status=${rec!.status})`);
    }
    if (rec!.auth_mode === "apikey") {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      return fetch(
        `https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/api-connector-proxy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            connector: key,
            path,
            init: { method: init.method ?? "GET", body: init.body, headers: init.headers },
          }),
        },
      );
    }
    // none/oauth fallback: direct fetch
    const base = rec!.endpoint?.replace(/\/$/, "") ?? "";
    return fetch(`${base}${path}`, init);
  }

  async function ssoIframeUrl(extra?: Record<string, string>) {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token ?? "";
    const url = new URL(rec!.iframe_url ?? rec!.endpoint ?? "about:blank");
    if (token) url.searchParams.set("token", token);
    for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v);
    return url.toString();
  }

  return {
    record: rec,
    fetch: authedFetch,
    openIframe: ssoIframeUrl,
    sso: ssoIframeUrl,
  };
}
