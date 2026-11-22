import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rhythmCurve, rhythmRows, rhythmSelection, rhythmSeries, rhythmWeek, type RhythmEntry } from "../../components/9fit/hubRhythm";
import { businessDate } from "../../services/dailyContextRules";

const end = "2026-11-21";
const fixture: RhythmEntry[] = [
  { category: "Água", date: end, label: "não usar texto para somar", amountMl: 500 },
  { category: "Água", date: end, label: "água", amountMl: 250 },
  { category: "Água", date: "2026-11-19", label: "água", amountMl: 1500 },
  { category: "Nutrição", date: end, label: "Almoço" },
  { category: "Nutrição", date: end, label: "Jantar" },
  { category: "Treino", date: end, label: "Sessão concluída" },
  { category: "Treino", date: end, label: "Treino autorrelatado", quickId: "quick-training" },
  { category: "Mente", date: end, label: "Pausa mental", quickId: "quick-mind" },
];
describe("ondas reais do Hub", () => {
  it("encerra sete datas no dia de São Paulo, inclusive na virada UTC", () => {
    const date = businessDate(new Date("2026-11-22T01:00:00Z"));
    assert.equal(date, end);
    assert.deepEqual(rhythmWeek(date), ["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", end]);
  });
  it("soma amountMl numérico por dia e semana sem extrair do label", () => {
    const points = rhythmSeries(fixture, "Água", end);
    assert.equal(points[6].value, 750);
    assert.equal(points.reduce((sum, point) => sum + point.value, 0), 2250);
    assert.equal(points.filter(point => point.records > 0).length, 2);
  });
  it("conta refeições, sessões e pausas; identifica autorrelatos", () => {
    assert.equal(rhythmSeries(fixture, "Nutrição", end)[6].value, 2);
    assert.equal(rhythmSeries(fixture, "Treino", end)[6].value, 2);
    assert.equal(rhythmSeries(fixture, "Treino", end)[6].selfReported, 1);
    assert.equal(rhythmSeries(fixture, "Mente", end)[6].value, 1);
  });
  it("seleciona datas pelo teclado e filtra dia ou semana", () => {
    const dates = rhythmWeek(end);
    assert.equal(rhythmSelection(dates, end, "ArrowLeft"), "2026-11-20");
    assert.equal(rhythmSelection(dates, end, "Home"), "2026-11-15");
    assert.equal(rhythmSelection(dates, dates[0], "End"), end);
    assert.equal(rhythmSelection(dates, end, "ArrowRight"), end);
    assert.equal(rhythmRows(fixture, dates, "2026-11-19", false).length, 1);
    assert.equal(rhythmRows(fixture, dates, "2026-11-19", true).length, 8);
  });
  it("inclusão e exclusão recalculam escala, curva e total", () => {
    const before = rhythmSeries(fixture, "Água", end);
    const inserted = [...fixture, { category: "Água" as const, date: end, label: "água", amountMl: 2000 }];
    const after = rhythmSeries(inserted, "Água", end);
    assert.equal(rhythmCurve(before).max, 1500);
    assert.equal(rhythmCurve(after).max, 2750);
    assert.notEqual(rhythmCurve(before).line, rhythmCurve(after).line);
    assert.equal(after.reduce((sum, point) => sum + point.value, 0), 4250);
    assert.deepEqual(rhythmSeries(inserted.slice(0, -1), "Água", end), before);
    const removed = rhythmSeries(fixture.filter(entry => entry.quickId !== "quick-mind"), "Mente", end);
    assert.equal(removed.reduce((sum, point) => sum + point.value, 0), 0);
    assert.notEqual(rhythmCurve(removed).line, rhythmCurve(rhythmSeries(fixture, "Mente", end)).line);
  });
  it("alinha cada ponto ao centro da respectiva coluna de data em qualquer largura", () => {
    const coordinates = rhythmCurve(rhythmSeries(fixture, "Água", end)).coordinates;
    for (const width of [288, 462, 680]) coordinates.forEach((point, index) => {
      assert.ok(Math.abs(point.x / 300 * width - (index + 0.5) * width / 7) < 0.00001);
    });
  });
  it("vazio mantém sete dias sem registros e curva finita", () => {
    const points = rhythmSeries([], "Água", end);
    assert.equal(points.length, 7);
    assert.ok(points.every(point => point.records === 0 && point.value === 0));
    assert.equal(rhythmCurve(points).max, 1);
    assert.ok(!/NaN|Infinity/.test(rhythmCurve(points).line));
  });
});