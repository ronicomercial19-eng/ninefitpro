export type RonHistoryStatus = "loading" | "ready" | "empty" | "unread";

export const RON_HISTORY_UNREAD =
  "Não foi possível carregar a conversa. Isso não significa que ela está vazia.";

export const RON_REPLY_MISSING =
  "O RON não retornou uma resposta válida. Tente novamente.";

/** Falha de leitura não é conversa vazia. Vazio só depois da consulta confirmar. */
export function ronHistoryStatus(
  loading: boolean,
  failed: boolean,
  messageCount: number,
): RonHistoryStatus {
  if (loading) return "loading";
  if (failed) return "unread";
  return messageCount > 0 ? "ready" : "empty";
}

/**
 * Às vezes o modelo devolve o envelope inteiro ({"content": "...", "actions": [...]})
 * como texto, ou cortado no meio. O balão nunca deve mostrar esse JSON: aqui sai só o texto
 * da resposta. As ações já chegam pelo campo próprio e viram os atalhos abaixo do balão.
 */
function unwrapJsonEnvelope(text: string): string {
  const body = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  if (!body.startsWith("{")) return text;
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.content === "string" && parsed.content.trim()) return parsed.content;
  } catch { /* JSON cortado ou malformado: tenta extrair só o campo content. */ }
  const match = body.match(/"content"\s*:\s*"((?:\\.|[^"\\])*)/);
  if (!match) return text;
  let raw = match[1];
  if (raw.endsWith("\\") && !raw.endsWith("\\\\")) raw = raw.slice(0, -1);
  try {
    const decoded = JSON.parse(`"${raw}"`);
    if (typeof decoded === "string" && decoded.trim()) return decoded;
  } catch { /* cai no desescape manual */ }
  const manual = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  return manual.trim() ? manual : text;
}

/** Uma resposta ausente continua sendo erro. Não preenche o balão com frase pronta. */
export function ronCoachReply(content: unknown): string {
  if (typeof content !== "string" || !content.trim()) {
    throw new Error(RON_REPLY_MISSING);
  }
  return unwrapJsonEnvelope(content);
}
