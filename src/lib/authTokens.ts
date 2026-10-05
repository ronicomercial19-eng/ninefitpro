/**
 * Parsing/limpeza de tokens de SSO vindos do portal ninelogin.
 * O portal envia no fragmento (#access_token=...&refresh_token=...);
 * a query (?access_token=...) é aceita como legado. Fragmento tem prioridade.
 * Funções puras — sem side effects, sem logs de token.
 */

export const AUTH_PARAM_KEYS = [
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "provider_token",
  "provider_refresh_token",
  "user_id",
] as const;

// Chaves que só são consideradas de auth quando vêm no fragmento
const FRAGMENT_ONLY_AUTH_KEYS = ["type", "error", "error_code", "error_description"];

export type ExtractedTokens =
  | { status: "none" }
  | { status: "partial"; source: "hash" | "query" }
  | { status: "ok"; source: "hash" | "query"; accessToken: string; refreshToken: string; userId: string | null };

function paramsFromHash(hash: string): URLSearchParams {
  return new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
}

function readFrom(params: URLSearchParams, source: "hash" | "query"): ExtractedTokens {
  const access = params.get("access_token")?.trim() || "";
  const refresh = params.get("refresh_token")?.trim() || "";
  if (!access && !refresh) return { status: "none" };
  if (!access || !refresh) return { status: "partial", source };
  return { status: "ok", source, accessToken: access, refreshToken: refresh, userId: params.get("user_id") };
}

export function extractAuthTokens(url: string): ExtractedTokens {
  const u = new URL(url);
  const fromHash = readFrom(paramsFromHash(u.hash), "hash");
  if (fromHash.status !== "none") return fromHash;
  return readFrom(u.searchParams, "query");
}

/** Remove apenas parâmetros de autenticação, preservando query/hash inocentes. Retorna path+query+hash. */
export function stripAuthParams(url: string): string {
  const u = new URL(url);
  const query = new URLSearchParams(u.search);
  AUTH_PARAM_KEYS.forEach((k) => query.delete(k));

  const hashParams = paramsFromHash(u.hash);
  const hashLooksLikeParams = u.hash.includes("=");
  let hash = u.hash;
  if (hashLooksLikeParams) {
    [...AUTH_PARAM_KEYS, ...FRAGMENT_ONLY_AUTH_KEYS].forEach((k) => hashParams.delete(k));
    const rest = hashParams.toString();
    hash = rest ? `#${rest}` : "";
  }
  const qs = query.toString();
  return `${u.pathname}${qs ? `?${qs}` : ""}${hash}`;
}

/** Decodifica payload do JWT (sem validar assinatura — isso é feito pelo setSession no servidor). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Pré-checagem: o access_token foi emitido pelo mesmo projeto Supabase? */
export function isTokenForProject(accessToken: string, supabaseUrl: string): boolean {
  const payload = decodeJwtPayload(accessToken);
  if (!payload || typeof payload.iss !== "string") return false;
  const expectedHost = new URL(supabaseUrl).host;
  try {
    return new URL(payload.iss).host === expectedHost;
  } catch {
    return false;
  }
}
