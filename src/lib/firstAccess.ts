type Result = { error: { message?: string } | null };
export interface FirstAccessClient {
  rpc(): PromiseLike<Result>;
  refreshSession(): PromiseLike<Result>;
}
export async function finalizeFirstAccess(client: FirstAccessClient, userId: string, store?: Pick<Storage, 'setItem' | 'removeItem'>): Promise<{ refreshFailed: boolean }> {
  const { error } = await client.rpc();
  if (error) throw new Error(error.message || 'Não foi possível concluir seu acesso. Tente novamente.');
  // Storage is optional. A browser restriction must not undo server success.
  try {
    store?.removeItem('9fit_first_access_completed');
    store?.setItem(`9fit_first_access_completed:${userId}`, 'true');
  } catch { /* Server remains authoritative. */ }
  try {
    const refreshed = await client.refreshSession();
    return { refreshFailed: !!refreshed.error };
  } catch { return { refreshFailed: true }; }
}
