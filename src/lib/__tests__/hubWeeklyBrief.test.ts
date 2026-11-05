import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeHubWeek, hubFactLabel, weekRead } from "../../components/9fit/hubWeeklyBrief";

describe("brief semanal do Hub", () => {
  it("não transforma leitura pendente em zero treinos ou zero refeições", () => {
    const copy = describeHubWeek(null, "loading");
    assert.equal(copy.trainStatus, "Lendo treinos da semana");
    assert.equal(copy.dietStatus, "Lendo registros de alimentação");
    assert.equal(copy.sessionsLabel, "lendo");
    assert.equal(copy.barPercent, null);
    assert.equal(copy.guidance, null);
    assert.equal(copy.nutriBadge, "Lendo");
    assert.doesNotMatch(copy.trainStatus, /Sem treino/);
    assert.doesNotMatch(copy.dietStatus, /Sem refeições/);
  });

  it("não confirma ausência quando a leitura falha antes do snapshot", () => {
    const copy = describeHubWeek(null, "unavailable");
    assert.equal(copy.trainStatus, "Treinos da semana não confirmados");
    assert.equal(copy.dietStatus, "Alimentação da semana não confirmada");
    assert.equal(copy.sessionsLabel, "—");
    assert.equal(copy.nutriBadge, "Não confirmado");
    assert.equal(copy.trainBadge, "Semana não confirmada");
  });

  it("com snapshot, zero continua sendo zero de verdade", () => {
    const copy = describeHubWeek({ treinos: 0, nutri: 0, minutos: 0 }, "ready");
    assert.equal(copy.trainStatus, "Sem treino registrado esta semana");
    assert.equal(copy.dietStatus, "Sem refeições registradas esta semana");
    assert.equal(copy.sessionsLabel, "0/5");
    assert.equal(copy.barPercent, 0);
    assert.match(copy.guidance ?? "", /Consistência vem antes/);
    assert.equal(copy.nutriBadge, "Sem registro");
  });

  it("mantém o ritmo quando a semana já foi lida", () => {
    const copy = describeHubWeek({ treinos: 2, nutri: 1, minutos: 40 }, "ready");
    assert.equal(copy.trainStatus, "Ritmo inicial");
    assert.equal(copy.dietStatus, "1 refeição registrada na semana");
    assert.equal(copy.guidance, "Faltam 3 sessões para a meta da semana. Agende a próxima agora.");
    assert.equal(copy.barPercent, 40);
  });

  it("não deixa um refresh apagar um snapshot já confirmado", () => {
    assert.equal(weekRead(true, "loading"), "ready");
    assert.equal(weekRead(true, "error"), "ready");
    assert.equal(weekRead(false, "loading"), "loading");
    assert.equal(weekRead(false, "error"), "unavailable");
    assert.equal(weekRead(false, "offline"), "unavailable");
  });

  it("não chama peso ou sequência de não registrados enquanto o snapshot não chega", () => {
    assert.equal(hubFactLabel(false, "loading", null, "Não registrado"), "Lendo");
    assert.equal(hubFactLabel(false, "error", null, "Não registrado"), "Não confirmado");
    assert.equal(hubFactLabel(true, "available", null, "Não registrado"), "Não registrado");
    assert.equal(hubFactLabel(true, "available", "72 kg", "Não registrado"), "72 kg");
    assert.equal(hubFactLabel(true, "stale", "0 dias", "Sem leitura"), "0 dias");
  });
});
