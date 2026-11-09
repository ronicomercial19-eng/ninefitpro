export const CORE_BASE = "https://hmppvtdlzsnxyiaozssu.supabase.co/functions/v1";
export class CoreError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}
export function coreConfig(env: (key: string) => string | undefined) {
  const base = (env("NINEZAP_BASE_URL") || CORE_BASE).replace(/\/+$/, "");
  if (base !== CORE_BASE) throw new CoreError(503, "core_origin_invalid");
  const secret = env("NINEZAP_SHARED_SECRET");
  if (!secret) throw new CoreError(503, "shared_secret_missing");
  const tenant = env("NINEZAP_TENANT") || "fitpro";
  if (tenant !== "fitpro") throw new CoreError(503, "tenant_invalid");
  return { base, secret, tenant };
}
export async function signedHeaders(secret: string, tenant: string, material: string, timestamp = Math.floor(Date.now() / 1000).toString()) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + "." + material));
  return { "content-type": "application/json", "x-zap-tenant": tenant, "x-zap-timestamp": timestamp,
    "x-zap-signature": Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("") };
}
export function makeCoreClient(config: ReturnType<typeof coreConfig>, fetcher = fetch) {
  return async (fn: "zap-api" | "core-events", path: string, method: "GET" | "POST" = "GET", body?: unknown) => {
    if (!path.startsWith("/api/public/") || path.includes("#")) throw new CoreError(400, "invalid_core_path");
    const material = method === "POST" ? JSON.stringify(body ?? {}) : (path.includes("?") ? path.slice(path.indexOf("?")) : "");
    const response = await fetcher(config.base + "/" + fn + path, {
      method, headers: await signedHeaders(config.secret, config.tenant, material),
      body: method === "POST" ? material : undefined, redirect: "error", signal: AbortSignal.timeout(28000),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const reasons: Record<string, string> = {
        "signature mismatch": "core_signature_mismatch",
        "missing signature headers": "core_signature_headers_missing",
        "timestamp expired": "core_timestamp_expired",
        "bad timestamp": "core_timestamp_invalid",
      };
      throw new CoreError(response.status, response.status === 401 && reasons[data?.error] ? reasons[data.error] : "core_http_" + response.status);
    }
    const data = await response.json().catch(() => null);
    if (!data || data.ok !== true) throw new CoreError(502, "invalid_core_response");
    return data;
  };
}
export function phoneBR(raw: unknown): string | null {
  let value = String(raw ?? "").replace(/\D/g, "");
  if (value.length === 10 || value.length === 11) value = "55" + value;
  return /^55[1-9]\d{9,10}$/.test(value) ? "+" + value : null;
}
export function uuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
