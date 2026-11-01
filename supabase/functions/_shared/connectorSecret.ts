// Administrative clients only. Never return resolved credentials to a browser.
declare const Deno: { env: { get(name: string): string | undefined } };
export async function connectorSecret(admin: any, key: string, ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  if (!ref.startsWith("vault:")) return Deno.env.get(ref) || null;
  const { data, error } = await admin.rpc("fn_connector_vault_secret", { p_key: key });
  if (error) throw new Error("connector_secret_unavailable");
  return typeof data === "string" && data ? data : null;
}
