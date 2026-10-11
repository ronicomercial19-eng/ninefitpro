/** Authentication only; payment event validation/fulfillment is a separate contract. */
export function webhookSecretFailure(configuredSecret: string | undefined, receivedSecret: string | string[] | undefined): 403 | 503 | null {
  if (!configuredSecret?.trim()) return 503;
  if (typeof receivedSecret !== 'string' || receivedSecret !== configuredSecret) return 403;
  return null;
}
