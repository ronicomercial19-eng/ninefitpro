type Metric = { value?: number | null; status?: string; observed_at?: string | null };
export function missingPhysiologyReply(message: string, snapshot: { vitals?: { hrv?: Metric; heart_rate?: Metric } } | null, now = Date.now()): string | null {
  const needsHrv = /\b(hrv|variabilidade|recupera[cç][aã]o|recovery|prontid[aã]o)\b/i.test(message);
  const needsHeart = /\b(bpm|frequ[eê]ncia card[ií]aca|batimentos|recupera[cç][aã]o|recovery|prontid[aã]o)\b/i.test(message);
  const available = (metric?: Metric) => metric?.status === 'available' && metric.value != null && Number.isFinite(metric.value) && !!metric.observed_at && Number.isFinite(Date.parse(metric.observed_at)) && now - Date.parse(metric.observed_at) >= 0 && now - Date.parse(metric.observed_at) < 36 * 3600000;
  const missing = [needsHrv && !available(snapshot?.vitals?.hrv) ? 'HRV recente' : null, needsHeart && !available(snapshot?.vitals?.heart_rate) ? 'frequência cardíaca recente' : null].filter(Boolean);
  return missing.length ? `Ainda não tenho ${missing.join(' e ')} confirmada para interpretar sua fisiologia. Registre uma medição atual pelo card do Hub. Posso ajudar com orientações gerais e revisar sua rotina declarada, mas não calcular recuperação ou indicar intensidade com esses sinais ausentes. O SYNC de rotina e os pontos de experiência não substituem essas medições.` : null;
}
