/**
 * Confiabilidade da avaliação guiada: medidas repetidas.
 * Prática padrão em antropometria: medir 2x; se divergir além da tolerância, medir uma 3ª vez e usar a mediana.
 */
import { parseNum } from "./guidedAssessment";

export type ReadingStatus = "none" | "single" | "ok" | "discordant" | "median3";

export interface Resolved {
  value: number | null;
  status: ReadingStatus;
  readings: number[];
  diff: number;
}

/** Tolerância máxima entre duas leituras. Circunferências: 1 cm. */
export function tolerance(key: string): number {
  if (key === "peso") return 0.5;
  if (key === "altura") return 1;
  return 1;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function resolveMeasure(raw: (string | undefined)[], tol: number): Resolved {
  const nums = raw.map((r) => parseNum(r)).filter((n): n is number => n !== null);
  if (nums.length === 0) return { value: null, status: "none", readings: [], diff: 0 };
  if (nums.length === 1) return { value: nums[0], status: "single", readings: nums, diff: 0 };
  if (nums.length === 2) {
    const diff = Math.abs(nums[0] - nums[1]);
    return { value: round1((nums[0] + nums[1]) / 2), status: diff <= tol ? "ok" : "discordant", readings: nums, diff: round1(diff) };
  }
  const sorted = [...nums.slice(0, 3)].sort((a, b) => a - b);
  return { value: sorted[1], status: "median3", readings: nums.slice(0, 3), diff: round1(sorted[2] - sorted[0]) };
}

export const isReliable = (r: Resolved) => r.status === "ok" || r.status === "median3";

export interface Confidence {
  points: number;
  max: number;
  label: "alta" | "parcial" | "baixa";
  /** o que fazer para chegar à pontuação máxima */
  tips: string[];
}

export function computeConfidence(args: {
  conditionsChecked: number;
  conditionsTotal: number;
  coreReliable: number; // de 3: peso, altura, cintura com leituras concordantes
  bodyFatAvailable: boolean;
  testsAllowed: boolean;
  testsDone: number;
  testsTotal: number;
  timerTests: number; // testes cronometrados feitos com o cronômetro do app
  timedTestsTotal: number;
}): Confidence {
  const tips: string[] = [];
  let points = args.conditionsChecked;
  let max = args.conditionsTotal;
  if (args.conditionsChecked < args.conditionsTotal) tips.push("Refaça a medição nas condições ideais e marque todas as caixas (jejum, fita justa, descansado).");

  max += 3;
  points += args.coreReliable;
  if (args.coreReliable < 3) tips.push("Meça peso, altura e cintura duas vezes, com diferença dentro da tolerância (0,5 kg no peso, 1 cm nas demais).");

  max += 1;
  if (args.bodyFatAvailable) points += 1;
  else tips.push("Informe cintura, pescoço (e quadril, se feminino) e o sexo biológico para estimar a gordura corporal.");

  if (args.testsAllowed) {
    max += 3;
    const ratio = args.testsTotal ? args.testsDone / args.testsTotal : 0;
    points += ratio >= 0.8 ? 2 : ratio >= 0.5 ? 1 : 0;
    if (ratio < 0.8) tips.push(`Faça mais testes (${args.testsDone} de ${args.testsTotal} preenchidos).`);
    if (args.timedTestsTotal > 0) {
      if (args.timerTests >= args.timedTestsTotal) points += 1;
      else tips.push("Use o cronômetro do app nos testes de tempo e contagem.");
    } else points += 1;
  }

  const ratio = points / max;
  return { points, max, label: ratio >= 0.85 ? "alta" : ratio >= 0.55 ? "parcial" : "baixa", tips };
}
