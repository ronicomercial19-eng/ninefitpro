/**
 * Conclusão de primeiro acesso — o servidor (RPC complete_first_access) é a
 * fonte de verdade. A flag local é só cache por user.id, gravada após sucesso.
 */

type RpcResult = { error: { message?: string } | null };

export interface FirstAccessClient {
  rpc: (fn: "complete_first_access") => PromiseLike<RpcResult>;
  refreshSession: () => PromiseLike<RpcResult>;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const LEGACY_FIRST_ACCESS_KEY = "9fit_first_access_completed";
export const firstAccessKey = (userId: string) => `9fit_first_access_completed:${userId}`;

export function hasLocalFirstAccess(store: KeyValueStore, userId: string): boolean {
  // A flag global antiga podia ser gravada mesmo com a RPC falhando — descarta.
  store.removeItem(LEGACY_FIRST_ACCESS_KEY);
  return store.getItem(firstAccessKey(userId)) === "true";
}

export type FinalizeResult =
  | { ok: true; refreshFailed: boolean }
  | { ok: false; error: string };

export async function finalizeFirstAccess(
  client: FirstAccessClient,
  store: KeyValueStore,
  userId: string,
): Promise<FinalizeResult> {
  let rpcError: RpcResult["error"];
  try {
    ({ error: rpcError } = await client.rpc("complete_first_access"));
  } catch (e) {
    rpcError = { message: e instanceof Error ? e.message : String(e) };
  }
  if (rpcError) {
    return { ok: false, error: rpcError.message || "Não foi possível finalizar o primeiro acesso." };
  }

  // Sucesso da RPC é autoritativo a partir daqui.
  store.setItem(firstAccessKey(userId), "true");

  let refreshFailed = false;
  try {
    const { error } = await client.refreshSession();
    refreshFailed = !!error;
  } catch {
    refreshFailed = true;
  }
  return { ok: true, refreshFailed };
}

export interface FirstAccessSignals {
  localCompleted: boolean;
  serverCompleted: boolean | null | undefined;
  /** null/undefined = sem registro de atleta (coach/admin) */
  passwordChanged: boolean | null | undefined;
  hasAthlete: boolean;
}

export function needsFirstAccess(s: FirstAccessSignals): boolean {
  if (s.localCompleted || s.serverCompleted === true) return false;
  if (!s.hasAthlete) return false;
  return s.passwordChanged === false;
}
