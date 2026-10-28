/** Bound URL size and request concurrency without silently dropping IDs. */
export async function fetchBatchedRows<T>(
  ids: readonly string[],
  fetchBatch: (ids: string[]) => PromiseLike<readonly T[]>,
  signal?: AbortSignal,
): Promise<T[]> {
  const unique = [...new Set(ids)];
  const chunks = Array.from({ length: Math.ceil(unique.length / 100) }, (_, i) => unique.slice(i * 100, (i + 1) * 100));
  const results: (readonly T[])[] = new Array(chunks.length);
  let next = 0;
  let failed = false;
  await Promise.all(Array.from({ length: Math.min(3, chunks.length) }, async () => {
    while (!failed) {
      signal?.throwIfAborted();
      const index = next++;
      if (index >= chunks.length) return;
      try { results[index] = await fetchBatch(chunks[index]); }
      catch (error) { failed = true; throw error; }
    }
  }));
  signal?.throwIfAborted();
  return results.flatMap(rows => [...rows]);
}
