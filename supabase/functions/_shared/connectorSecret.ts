// Resolve o segredo de um conector (api_connectors.secret_ref) de forma tolerante.
//
// Problema encontrado na inspeção de 15/10: secret_ref é gravado como "nome:timestamp"
// (ex.: "smart_periodizer:1780325045679"), que não é um nome de variável de ambiente
// utilizável; Deno.env.get(secret_ref) devolvia sempre vazio e os proxies respondiam
// 503 / "Missing bearer token".
//
// Agora tentamos, em ordem: o valor literal, uma versão sanitizada em MAIÚSCULAS, e os
// nomes convencionais <CHAVE>_API_KEY / <CHAVE>_SECRET. Para ativar um conector basta
// criar o secret do Supabase com um destes nomes (ex.: POSTURA_PRO_API_KEY).
const sanitize = (value: string) => value.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();

export function resolveConnectorSecret(secretRef: string | null | undefined, connectorKey?: string): string | null {
  const candidates: string[] = [];
  if (secretRef) {
    candidates.push(secretRef, sanitize(secretRef));
    const base = sanitize(secretRef.split(":")[0] ?? "");
    if (base) candidates.push(`${base}_API_KEY`, `${base}_SECRET`, base);
  }
  if (connectorKey) {
    const key = sanitize(connectorKey);
    candidates.push(`${key}_API_KEY`, `${key}_SECRET`);
  }
  for (const name of new Set(candidates)) {
    if (!name) continue;
    try {
      const value = Deno.env.get(name);
      if (value) return value;
    } catch (_) { /* nome inválido para env: ignora */ }
  }
  return null;
}
