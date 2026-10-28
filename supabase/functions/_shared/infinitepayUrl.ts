// The provider returns either a saved slug or an encrypted lenc checkout URL.
export function checkoutUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 8192 || !/^https:\/\/checkout\.infinitepay\.io\/ronynapoleao(?:\/[A-Za-z0-9_-]+\/?|\/?\?lenc=[A-Za-z0-9_.-]+)$/.test(value)) throw new Error('invalid_checkout_url');
  return value;
}
