/**
 * Detector de dor em mensagens PT-BR do usuário.
 * Retorna body_region canônico + intensidade estimada (0-10).
 */
export type PainDetection = {
  detected: boolean;
  body_region: string | null;
  intensity: number;
  raw: string;
};

const REGIONS: Array<{ key: string; pat: RegExp }> = [
  { key: "joelho",    pat: /joelho|patela|menisco/i },
  { key: "ombro",     pat: /ombro|deltoide|manguito/i },
  { key: "lombar",    pat: /lombar|coluna|lombo|zona baixa das costas|dor nas costas/i },
  { key: "cervical",  pat: /cervical|pesco[çc]o|nuca/i },
  { key: "punho",     pat: /punho|pulso/i },
  { key: "cotovelo",  pat: /cotovelo/i },
  { key: "tornozelo", pat: /tornozelo/i },
  { key: "quadril",   pat: /quadril|virilha|glúteo|gluteo/i },
  { key: "coxa",      pat: /coxa|posterior|isquio|quadriceps|quadr[íi]ceps/i },
  { key: "panturrilha", pat: /panturrilha|batata da perna/i },
  { key: "pe",        pat: /\bp[ée]s?\b|calcanhar|fasc[íi]te/i },
];

const PAIN_TRIGGERS = /d[oó]i|dor|d[oó]en[dt]o|d[oó]endo|travou|travad[oa]|estralou|estirou|estirei|latejando|ardendo|inflam[ae]/i;

const INTENSITY_HINTS: Array<{ pat: RegExp; v: number }> = [
  { pat: /(muito|forte|insuport[áa]vel|10\/10|10 de 10)/i, v: 9 },
  { pat: /(bastante|bem forte|7|8)/i, v: 7 },
  { pat: /(m[ée]dia|moderad[ao]|5|6)/i, v: 6 },
  { pat: /(leve|pouca|fraca|2|3|4)/i, v: 3 },
];

export function detectPain(text: string): PainDetection {
  const raw = (text || "").trim();
  if (!raw) return { detected: false, body_region: null, intensity: 0, raw };

  const hasPain = PAIN_TRIGGERS.test(raw);
  const region = REGIONS.find(r => r.pat.test(raw));
  if (!hasPain && !region) return { detected: false, body_region: null, intensity: 0, raw };

  // intensidade
  let intensity = 5;
  for (const h of INTENSITY_HINTS) if (h.pat.test(raw)) { intensity = h.v; break; }
  const num = raw.match(/\b(10|[1-9])\b/);
  if (num) intensity = Math.min(10, Math.max(1, parseInt(num[1], 10)));

  return {
    detected: hasPain || !!region,
    body_region: region?.key ?? null,
    intensity,
    raw,
  };
}
