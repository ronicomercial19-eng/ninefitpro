import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { coverageFill, coverageLabel, coverageReadState } from "../../components/9fit/hubQuickCoverage";

describe("cobertura de 7 dias do Hub", () => {
  it("não chama zero enquanto a leitura não voltou", () => {
    assert.equal(coverageLabel("loading", 0), "Lendo os últimos 7 dias");
    assert.equal(coverageLabel("unavailable", 0), "Últimos 7 dias não confirmados");
    assert.equal(coverageFill("loading", 0), undefined);
    assert.equal(coverageFill("unavailable", 0), undefined);
  });

  it("com a leitura pronta, zero continua zero", () => {
    assert.equal(coverageLabel("ready", 0), "0 de 7 dias com registro");
    assert.equal(coverageFill("ready", 0), 0);
    assert.equal(coverageLabel("ready", 3), "3 de 7 dias com registro");
  });

  it("refresh que falha não desconfirma a semana já lida", () => {
    assert.equal(coverageReadState(true, true), "ready");
    assert.equal(coverageReadState(true, false), "ready");
    assert.equal(coverageReadState(false, true), "unavailable");
    assert.equal(coverageReadState(false, false), "loading");
  });
});
