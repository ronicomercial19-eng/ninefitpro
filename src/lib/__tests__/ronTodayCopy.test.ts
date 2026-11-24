import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ronResultCardsAfterRead, ronTodayCopy } from "../../components/9fit/ronTodayCopy";

describe("card do RON no Hub", () => {
  it("não convida o check-in enquanto a leitura não confirmou o dia", () => {
    for (const status of ["loading", "error"] as const) {
      const copy = ronTodayCopy(status, null);
      assert.equal(copy.openCheckin, false);
      assert.equal(copy.action, "Abrir RON");
      assert.equal(copy.title.includes("Comece contando"), false);
      assert.equal(copy.title.includes("vazio") || copy.title.includes("não confirmada") || copy.title.includes("Lendo"), true);
    }
  });

  it("mantém a conversa e a calibração quando a leitura já tem um estado conhecido", () => {
    const ready = ronTodayCopy("available", 72);
    assert.equal(ready.openCheckin, false);
    assert.equal(ready.action, "Conversar com RON");
    assert.equal(ready.signal, "SYNC 72/100");
    assert.equal(ready.chip, "CONTEXTO DISPONÍVEL");

    const calibrating = ronTodayCopy("calibrating", null);
    assert.equal(calibrating.openCheckin, true);
    assert.equal(calibrating.title, "Comece contando como você está hoje.");
    assert.equal(ronTodayCopy("offline", 40).signal, "Offline");
    assert.equal(ronTodayCopy("stale", 40).title, "Confira a leitura antes de interpretar o dia.");
  });

  it("não apaga resultados já lidos quando a nova consulta falha", () => {
    const previous = [{ id: "week" }];
    assert.deepEqual(ronResultCardsAfterRead(previous, true, []), previous);
    assert.deepEqual(ronResultCardsAfterRead(previous, false, [{ id: "nutrition" }]), [{ id: "nutrition" }]);
    assert.deepEqual(ronResultCardsAfterRead([], true, [{ id: "week" }]), []);
  });
});
