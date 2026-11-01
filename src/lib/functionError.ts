export function functionErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  const message = typeof error === "string" ? error : error && typeof error === "object" ? (error as { message?: unknown }).message : null;
  return typeof message === "string" && message.trim() ? message : fallback;
}
