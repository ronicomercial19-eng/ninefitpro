import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  nutritionGoalLine,
  nutritionHeadline,
  nutritionKcalText,
  nutritionRead,
  nutritionReviewFacts,
} from "../../components/9fit/nutritionTodayCopy";

describe("alimentação de hoje no Hub", () => {
  it("não chama ausência enquanto a leitura não voltou", () => {
    assert.equal(nutritionRead(true, false, false), "loading");
    assert.equal(nutritionRead(false, true, false), "unread");
    assert.equal(nutritionHeadline("loading", null), "Lendo a alimentação de hoje");
    assert.equal(nutritionHeadline("unread", null), "Alimentação de hoje não confirmada");
    assert.equal(nutritionGoalLine("loading", null), "Lendo a meta");
    assert.equal(nutritionGoalLine("unread", 0), "Meta não confirmada");
    assert.equal(nutritionKcalText("loading", 0), "—");
    assert.equal(nutritionKcalText("unread", 0), "—");
  });

  it("com a leitura pronta, vazio continua vazio", () => {
    assert.equal(nutritionRead(false, false, true), "ready");
    assert.equal(nutritionHeadline("ready", null), "Sem plano alimentar ativo");
    assert.equal(nutritionHeadline("ready", "Cutting"), "Cutting");
    assert.equal(nutritionGoalLine("ready", null), "sem meta prescrita");
    assert.equal(nutritionGoalLine("ready", 1800), "de 1800 kcal");
    assert.equal(nutritionKcalText("ready", 420.4), "420 kcal");
  });

  it("um refresh que falha não apaga o dia já lido", () => {
    assert.equal(nutritionRead(false, true, true), "stale");
    assert.equal(nutritionRead(true, true, true), "stale");
    assert.equal(nutritionHeadline("stale", "Cutting"), "Cutting · atualização não confirmada");
    assert.equal(nutritionGoalLine("stale", 1800), "de 1800 kcal");
    assert.equal(nutritionKcalText("stale", 420), "420 kcal");
    assert.match(nutritionReviewFacts("unread", { dietName: null, meals: 0, calories: 0, protein: 0, waterMl: 0, goals: {} }), /não foi confirmada/);
    assert.match(nutritionReviewFacts("stale", { dietName: "Cutting", meals: 2, calories: 900, protein: 40, waterMl: 500, goals: { calories: 1800 } }), /Cutting/);
    assert.doesNotMatch(nutritionReviewFacts("unread", { dietName: null, meals: 0, calories: 0, protein: 0, waterMl: 0, goals: {} }), /0 refeições/);
  });
});
