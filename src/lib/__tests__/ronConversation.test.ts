import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RON_HISTORY_UNREAD,
  RON_REPLY_MISSING,
  ronCoachReply,
  ronHistoryStatus,
} from "../../components/9fit/ronConversation";

describe("conversa do RON", () => {
  it("não trata a conversa como vazia enquanto a leitura não termina", () => {
    assert.equal(ronHistoryStatus(true, false, 0), "loading");
    assert.equal(ronHistoryStatus(true, true, 0), "loading");
  });

  it("falha de leitura não vira conversa vazia", () => {
    assert.equal(ronHistoryStatus(false, true, 0), "unread");
    assert.match(RON_HISTORY_UNREAD, /não significa que ela está vazia/);
    assert.doesNotMatch(RON_HISTORY_UNREAD, /Olá/);
  });

  it("vazio só quando a consulta confirma que não há mensagens", () => {
    assert.equal(ronHistoryStatus(false, false, 0), "empty");
    assert.equal(ronHistoryStatus(false, false, 2), "ready");
  });

  it("não inventa uma resposta quando o coach volta vazio", () => {
    assert.equal(ronCoachReply("  Pode treinar hoje.  "), "  Pode treinar hoje.  ");
    assert.throws(() => ronCoachReply(""), { message: RON_REPLY_MISSING });
    assert.throws(() => ronCoachReply("   "), { message: RON_REPLY_MISSING });
    assert.throws(() => ronCoachReply(null), { message: RON_REPLY_MISSING });
    assert.doesNotMatch(RON_REPLY_MISSING, /Entendido/);
  });
});
