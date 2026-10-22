/**
 * Avaliação guiada — regras puras (sem React) para cálculos e classificações.
 * Tudo aqui é ESTIMATIVA de triagem/acompanhamento, não diagnóstico.
 */

export type Level = "iniciante" | "intermediario" | "avancado";
export type Sexo = "M" | "F" | null;

export interface Field {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  optional?: boolean;
}

export interface Test {
  id: string;
  title: string;
  why: string;
  how: string[];
  stop: string;
  fields: Field[];
  /** o usuário escolhe a variação (precisa registrar para comparar depois) */
  variations?: { key: string; options: string[] };
}

/** Interpreta número digitado (aceita vírgula). Retorna null se vazio/inválido. */
export function parseNum(raw: string | undefined): number | null {
  if (raw == null) return null;
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Estimativa de gordura corporal pelo método da Marinha dos EUA (medidas em cm). Margem de alguns pontos percentuais. */
export function navyBodyFat(sexo: Sexo, alturaCm: number | null, cinturaCm: number | null, pescocoCm: number | null, quadrilCm: number | null): number | null {
  if (!sexo || !alturaCm || !cinturaCm || !pescocoCm) return null;
  let bf: number;
  if (sexo === "M") {
    const d = cinturaCm - pescocoCm;
    if (d <= 0) return null;
    bf = 495 / (1.0324 - 0.19077 * Math.log10(d) + 0.15456 * Math.log10(alturaCm)) - 450;
  } else {
    if (!quadrilCm) return null;
    const d = cinturaCm + quadrilCm - pescocoCm;
    if (d <= 0) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(d) + 0.221 * Math.log10(alturaCm)) - 450;
  }
  if (!Number.isFinite(bf) || bf < 2 || bf > 70) return null;
  return Math.round(bf * 10) / 10;
}

/** 1RM estimado por repetições submaxímas (Brzycki). Válido para 1 a 10 repetições. */
export function brzycki1RM(cargaKg: number | null, reps: number | null): number | null {
  if (!cargaKg || !reps || reps < 1 || reps > 10 || cargaKg <= 0) return null;
  return Math.round((cargaKg * 36) / (37 - reps) * 10) / 10;
}

export function imc(pesoKg: number | null, alturaCm: number | null): number | null {
  if (!pesoKg || !alturaCm) return null;
  return Math.round((pesoKg / Math.pow(alturaCm / 100, 2)) * 10) / 10;
}

export function imcFaixa(v: number): string {
  if (v < 18.5) return "abaixo da faixa de referência da OMS";
  if (v < 25) return "dentro da faixa de referência da OMS";
  if (v < 30) return "na faixa de sobrepeso (OMS)";
  return "na faixa de obesidade (OMS)";
}

/** Relação cintura/altura: acima de 0,5 costuma indicar mais gordura abdominal. */
export function rce(cinturaCm: number | null, alturaCm: number | null): number | null {
  if (!cinturaCm || !alturaCm) return null;
  return Math.round((cinturaCm / alturaCm) * 100) / 100;
}

/** Relação cintura/quadril. Pontos de atenção da OMS: ≥ 0,90 (homens) e ≥ 0,85 (mulheres). */
export function rcq(cinturaCm: number | null, quadrilCm: number | null): number | null {
  if (!cinturaCm || !quadrilCm) return null;
  return Math.round((cinturaCm / quadrilCm) * 100) / 100;
}

export function rcqAtencao(v: number, sexo: Sexo): boolean {
  if (!sexo) return false;
  return sexo === "M" ? v >= 0.9 : v >= 0.85;
}

/** Perguntas de triagem (baseadas no PAR-Q). Qualquer "sim" restringe os testes de esforço. */
export const SCREENING: { id: string; text: string }[] = [
  { id: "cardiaco", text: "Algum médico já disse que você tem problema cardíaco ou pressão alta e que só deve se exercitar com supervisão?" },
  { id: "dor_peito", text: "Você sente dor no peito em repouso, ao se exercitar ou ao subir escadas?" },
  { id: "tontura", text: "Você perde o equilíbrio por tontura ou perdeu a consciência nos últimos 12 meses?" },
  { id: "osteo", text: "Você tem problema ósseo, articular ou lesão recente que piora com atividade física?" },
  { id: "medicamento", text: "Você usa medicamento para pressão ou coração?" },
  { id: "gestacao", text: "Você está gestante ou no pós-parto recente (até 6 meses)?" },
  { id: "outra", text: "Existe outro motivo pelo qual você não deveria fazer exercício intenso?" },
];

export const MEASURES: (Field & { how: string })[] = [
  { key: "peso", label: "Peso", unit: "kg", min: 20, max: 400, how: "Pese-se de manhã, em jejum, depois de ir ao banheiro, com roupa leve e sempre na mesma balança." },
  { key: "altura", label: "Altura", unit: "cm", min: 100, max: 250, how: "Descalço, encostado na parede, calcanhares juntos, olhando para frente. Marque no topo da cabeça com um livro." },
  { key: "circunferencia_cintura", label: "Cintura", unit: "cm", min: 40, max: 250, how: "Fita na altura do umbigo, em pé, relaxado, ao final de uma expiração normal. Fita justa, sem apertar a pele." },
  { key: "circunferencia_quadril", label: "Quadril", unit: "cm", min: 50, max: 250, how: "Fita na parte mais larga do bumbum, pés juntos, fita paralela ao chão." },
  { key: "circunferencia_pescoco", label: "Pescoço", unit: "cm", min: 20, max: 80, how: "Fita logo abaixo do pomo de adão (laringe), olhando para frente, sem encolher os ombros." },
  { key: "circunferencia_braco", label: "Braço (relaxado)", unit: "cm", min: 15, max: 80, optional: true, how: "No ponto médio entre ombro e cotovelo, braço solto ao lado do corpo." },
  { key: "circunferencia_coxa", label: "Coxa", unit: "cm", min: 25, max: 120, optional: true, how: "No ponto médio entre a dobra do quadril e o joelho, em pé, peso dividido nas duas pernas." },
  { key: "circunferencia_panturrilha", label: "Panturrilha", unit: "cm", min: 15, max: 70, optional: true, how: "Na parte mais larga da panturrilha, em pé, peso dividido nas duas pernas." },
];

export const CONDITIONS: { id: string; text: string }[] = [
  { id: "manha_jejum", text: "Medi o peso de manhã, em jejum e após ir ao banheiro" },
  { id: "fita_justa", text: "Usei fita métrica flexível, justa e sobre a pele ou roupa fina" },
  { id: "descansado", text: "Estou descansado, hidratado e sem treino pesado nas últimas 24h" },
];

const T_FC: Test = {
  id: "fc_repouso", title: "Frequência cardíaca de repouso", why: "Indicador simples de condicionamento e recuperação. Quanto mais descansado, mais confiável.",
  how: ["Logo ao acordar, ainda deitado, ou após 5 min sentado em silêncio.", "Apoie dois dedos no pulso (não o polegar) ou use um relógio.", "Conte as batidas por 60 segundos."],
  stop: "Se sentir tontura ou falta de ar em repouso, pare e procure orientação médica.",
  fields: [{ key: "cardio_bpm_repouso", label: "Batimentos por minuto", unit: "bpm", min: 30, max: 130 }],
};
const T_CHAIR: Test = {
  id: "sentar_levantar_30s", title: "Sentar e levantar da cadeira (30 s)", why: "Mede força e resistência de pernas de forma segura, do iniciante ao avançado.",
  how: ["Cadeira firme, sem braços, encostada na parede (altura ~43 cm).", "Braços cruzados no peito, pés apoiados no chão.", "Em 30 s, levante completamente e sente de novo quantas vezes conseguir. Conte só as repetições completas."],
  stop: "Pare se sentir dor, tontura ou desequilíbrio. Peça para alguém ficar por perto.",
  fields: [{ key: "sentar_levantar_30s", label: "Repetições completas", unit: "reps", min: 0, max: 80 }],
};
const T_PLANK: Test = {
  id: "prancha", title: "Prancha (resistência do core)", why: "Tempo mantendo o tronco alinhado. Compare sempre com você mesmo.",
  how: ["Antebraços e pontas dos pés no chão, cotovelos sob os ombros.", "Corpo em linha reta da cabeça aos calcanhares; abdômen firme, sem afundar o quadril.", "Cronometre até o quadril cair ou a forma quebrar. Se puder, grave um vídeo."],
  stop: "Pare se sentir dor na lombar ou nos ombros.",
  fields: [{ key: "core_prancha_seg", label: "Tempo", unit: "seg", min: 0, max: 1800 }],
};
const T_PUSH: Test = {
  id: "flexao", title: "Flexões de braço (máximo com boa técnica)", why: "Força de empurrar do tronco superior. Anote a variação usada para comparar depois.",
  how: ["Escolha a variação e use sempre a mesma.", "Corpo alinhado, peito quase toca o chão (ou o apoio), cotovelos a ~45° do tronco.", "Conte só repetições completas e pare quando a técnica quebrar."],
  stop: "Pare se sentir dor no ombro, punho ou peito.",
  variations: { key: "flexao_variacao", options: ["Na parede", "Inclinada (banco)", "De joelhos", "Padrão"] },
  fields: [{ key: "rml_flexao", label: "Repetições", unit: "reps", min: 0, max: 300 }],
};
const T_SQUAT: Test = {
  id: "agachamento", title: "Agachamento livre (60 s)", why: "Resistência de pernas e controle de movimento, sem carga.",
  how: ["Pés na largura dos ombros, calcanhares no chão, tronco firme.", "Desça até as coxas ficarem paralelas ao chão (ou o mais perto sem dor) e suba por completo.", "Faça quantas repetições completas conseguir em 60 s, em ritmo constante."],
  stop: "Pare se sentir dor no joelho, quadril ou lombar.",
  fields: [{ key: "rml_agachamento", label: "Repetições em 60 s", unit: "reps", min: 0, max: 500 }],
};
const T_SIDE: Test = {
  id: "prancha_lateral", title: "Prancha lateral (cada lado)", why: "Equilíbrio entre os dois lados do core.",
  how: ["Apoio em um antebraço, pés empilhados, quadril elevado em linha reta.", "Cronometre cada lado separadamente, até o quadril cair."],
  stop: "Pare se sentir dor no ombro ou na lombar.",
  fields: [
    { key: "core_side_plank_esq_seg", label: "Lado esquerdo", unit: "seg", min: 0, max: 900 },
    { key: "core_side_plank_dir_seg", label: "Lado direito", unit: "seg", min: 0, max: 900 },
  ],
};
const T_PULL: Test = {
  id: "barra", title: "Barra fixa (máximo de repetições)", why: "Força relativa de puxar.",
  how: ["Pegada pronada na largura dos ombros, início com braços estendidos.", "Queixo passa da barra, sem balançar. Conte só repetições completas."],
  stop: "Pare se sentir dor no ombro ou no cotovelo.",
  fields: [{ key: "rml_pull", label: "Repetições", unit: "reps", min: 0, max: 100 }],
};

/** Força por repetições submaxímas: seguro, sem testar 1RM de verdade. */
function rmTest(id: string, title: string, rmKey: string): Test {
  return {
    id, title: `${title} — força estimada`, why: "Estimamos seu 1RM a partir de uma série até a falha técnica (1 a 10 repetições). Mais seguro que testar 1RM direto.",
    how: ["Aqueça bem com séries leves progressivas.", "Escolha uma carga com a qual você consiga de 3 a 8 repetições.", "Faça uma série até a falha técnica, com alguém acompanhando ou com travas de segurança."],
    stop: "Não faça se estiver com dor, cansado ou sem segurança (barra com travas ou parceiro).",
    fields: [
      { key: `${rmKey}_carga`, label: "Carga usada", unit: "kg", min: 1, max: 1000, optional: true },
      { key: `${rmKey}_reps`, label: "Repetições feitas", unit: "reps", min: 1, max: 10, optional: true },
    ],
  };
}

export const TESTS_BY_LEVEL: Record<Level, Test[]> = {
  iniciante: [T_FC, T_CHAIR, T_PLANK],
  intermediario: [T_FC, T_CHAIR, T_PLANK, T_PUSH, T_SQUAT, T_SIDE],
  avancado: [T_FC, T_CHAIR, T_PLANK, T_PUSH, T_SQUAT, T_SIDE, T_PULL,
    rmTest("rm_supino", "Supino", "rm_supino"), rmTest("rm_agachamento", "Agachamento com barra", "rm_agachamento"), rmTest("rm_remada", "Remada ou puxada", "rm_puxada")],
};

export const LEVEL_INFO: Record<Level, { label: string; desc: string }> = {
  iniciante: { label: "Iniciante", desc: "Estou começando ou voltando agora. Testes simples e seguros, sem equipamento." },
  intermediario: { label: "Intermediário", desc: "Treino com alguma regularidade. Inclui flexão, agachamento e prancha lateral." },
  avancado: { label: "Avançado", desc: "Treino há anos e tenho acesso a academia. Inclui barra fixa e força estimada." },
};
