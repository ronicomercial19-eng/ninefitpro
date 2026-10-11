const AUTH_KEYS = ['access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'provider_token', 'provider_refresh_token', 'user_id'];
export type IncomingAuth = { kind: 'none' } | { kind: 'invalid' } | { kind: 'session'; accessToken: string; refreshToken: string };

export function readIncomingAuth(url: string): IncomingAuth {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.slice(1));
  // Never combine credentials from different sources.
  const source = hash.has('access_token') || hash.has('refresh_token') ? hash : parsed.searchParams;
  if (!source.has('access_token') && !source.has('refresh_token')) return { kind: 'none' };
  const accessToken = source.get('access_token')?.trim();
  const refreshToken = source.get('refresh_token')?.trim();
  return accessToken && refreshToken ? { kind: 'session', accessToken, refreshToken } : { kind: 'invalid' };
}

export function cleanAuthUrl(url: string): string {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.slice(1));
  const authHash = AUTH_KEYS.some(key => hash.has(key));
  AUTH_KEYS.forEach(key => { parsed.searchParams.delete(key); if (authHash) hash.delete(key); });
  if (authHash) {
    ['type', 'error', 'error_code', 'error_description'].forEach(key => hash.delete(key));
    parsed.hash = hash.toString();
  }
  return parsed.pathname + parsed.search + parsed.hash;
}

export function tokenMatchesProject(token: string, projectUrl: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(raw.padEnd(Math.ceil(raw.length / 4) * 4, '=')));
    return payload.iss === new URL('/auth/v1', projectUrl).toString();
  } catch { return false; }
}
