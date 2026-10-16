// Resolve o segredo de um conector (api_connectors).
//
// Causa raiz encontrada na inspeção de 15/10: a UI (ApiConnectorCard) NUNCA persistia a API Key
// digitada — gravava só o hint de 4 caracteres e um secret_ref inventado ("nome:timestamp"),
// e os proxies faziam Deno.env.get(secret_ref), que não existe. Resultado: 503 / "Missing bearer token".
//
// Agora a chave fica no Supabase Vault (public.set_connector_secret, só admin) e é lida aqui via
// public.get_connector_secret (só service_role). Variáveis de ambiente continuam como fallback
// (ex.: POSTURA_PRO_API_KEY) para quem preferir configurar pelo painel do Supabase.
const sanitize = (value: string) => value.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();

export function resolveConnectorSecret(secretRef: string | null | undefined, connectorKey?: string): string | null {
  const candidates: string[] = [];
  if (secretRef) {
    candidates.push(secretRef, sanitize(secretRef));
    const base = sanitize(secretRef.split(":")[0] ?? "");
    if (base) candidates.push(`${base}_API_KEY`, `${base}_SECRET`, base);
  }
  if (connectorKey) {
    const key = sanitize(connectorKey);
    candidates.push(`${key}_API_KEY`, `${key}_SECRET`);
  }
  for (const name of new Set(candidates)) {
    if (!name) continue;
    try {
      const value = Deno.env.get(name);
      if (value) return value;
    } catch (_) { /* nome inválido para env: ignora */ }
  }
  return null;
}

// `admin` = cliente supabase-js com a service role key.
export async function loadConnectorSecret(
  admin: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> },
  connectorKey: string,
  secretRef?: string | null,
): Promise<string | null> {
  try {
    const { data } = await admin.rpc("get_connector_secret", { p_key: connectorKey });
    if (typeof data === "string" && data.length > 0) return data;
  } catch (_) { /* cai no fallback de ambiente */ }
  return resolveConnectorSecret(secretRef, connectorKey);
}
