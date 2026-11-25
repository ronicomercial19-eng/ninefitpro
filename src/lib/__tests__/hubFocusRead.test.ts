import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hubFocusNotice,
  libraryAfterRead,
  planAfterRead,
} from "../../components/9fit/hubFocusRead";

describe("leitura do ciclo e da biblioteca no Hub", () => {
  it("não trata a primeira falha do plano como ausência de ciclo", () => {
    const read = planAfterRead(null, "ath-1", true, null);
    assert.equal(read.status, "unavailable");
    assert.equal(read.title, null);
    assert.equal(read.stale, false);
    assert.equal(read.confirmed, null);
  });

  it("confirma ciclo ativo ou ausência só depois da leitura", () => {
    const active = planAfterRead(null, "ath-1", false, "Força 12 semanas");
    assert.equal(active.status, "active");
    assert.equal(active.title, "Força 12 semanas");
    const none = planAfterRead(null, "ath-1", false, null);
    assert.equal(none.status, "none");
    assert.equal(none.title, null);
    assert.equal(none.stale, false);
  });

  it("mantém o ciclo já confirmado quando o refresh falha", () => {
    const confirmed = planAfterRead(null, "ath-1", false, "Força 12 semanas").confirmed;
    const stale = planAfterRead(confirmed, "ath-1", true, null);
    assert.equal(stale.status, "active");
    assert.equal(stale.title, "Força 12 semanas");
    assert.equal(stale.stale, true);
    assert.equal(stale.confirmed, confirmed);

    const empty = planAfterRead(null, "ath-1", false, null).confirmed;
    const stillEmpty = planAfterRead(empty, "ath-1", true, "não usar");
    assert.equal(stillEmpty.status, "none");
    assert.equal(stillEmpty.title, null);
    assert.equal(stillEmpty.stale, true);
  });

  it("não reaproveita o ciclo de outro atleta", () => {
    const confirmed = planAfterRead(null, "ath-1", false, "Força 12 semanas").confirmed;
    const other = planAfterRead(confirmed, "ath-2", true, null);
    assert.equal(other.status, "unavailable");
    assert.equal(other.title, null);
    assert.equal(other.confirmed, null);
  });

  it("não zera a biblioteca já lida quando a nova consulta falha", () => {
    const firstFail = libraryAfterRead(null, "ath-1", true, 4);
    assert.equal(firstFail.status, "unavailable");
    assert.equal(firstFail.count, 0);

    const ready = libraryAfterRead(null, "ath-1", false, 0);
    assert.equal(ready.status, "ready");
    assert.equal(ready.count, 0);

    const stale = libraryAfterRead(ready.confirmed, "ath-1", true, 9);
    assert.equal(stale.status, "ready");
    assert.equal(stale.count, 0);
    assert.equal(stale.stale, true);

    const other = libraryAfterRead(ready.confirmed, "ath-2", true, 9);
    assert.equal(other.status, "unavailable");
    assert.equal(other.count, 0);
  });

  it("avisa atualização incompleta sem dizer que a tela ficou vazia", () => {
    assert.equal(
      hubFocusNotice({
        planFailed: false,
        libraryFailed: false,
        planStale: false,
        libraryStale: false,
      }),
      null,
    );
    assert.equal(
      hubFocusNotice({
        planFailed: true,
        libraryFailed: true,
        planStale: false,
        libraryStale: false,
      }),
      "Não foi possível carregar seus dados agora.",
    );
    assert.equal(
      hubFocusNotice({
        planFailed: true,
        libraryFailed: false,
        planStale: false,
        libraryStale: false,
      }),
      "Alguns sinais estão sincronizando.",
    );
    assert.equal(
      hubFocusNotice({
        planFailed: true,
        libraryFailed: false,
        planStale: true,
        libraryStale: false,
      }),
      "Não foi possível atualizar. A última leitura confirmada continua na tela.",
    );
  });
});
