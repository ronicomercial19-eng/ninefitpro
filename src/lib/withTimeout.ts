/** Bound read-only requests so the screen can offer a retry after a lost response. */
export async function withTimeout<T>(request: PromiseLike<T>, milliseconds = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('A consulta demorou demais. Tente novamente.')), milliseconds);
      }),
    ]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}
