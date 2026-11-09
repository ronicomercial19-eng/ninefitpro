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

/** Uma resposta ausente continua sendo erro. Não preenche o balão com frase pronta. */
export function ronCoachReply(content: unknown): string {
  if (typeof content !== "string" || !content.trim()) {
    throw new Error(RON_REPLY_MISSING);
  }
  return content;
}
