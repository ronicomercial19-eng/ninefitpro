
export type ContentKind = 'protocol' | 'learn' | 'ebook';
export type TrainingContent = { id: string; title: string; kind: ContentKind; description: string; url: string | null; locked: boolean; score: number };
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' ? value : '';
const termsText = (value: unknown): string => Array.isArray(value) ? value.map(termsText).join(' ') : text(value);
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function safeContentUrl(value: unknown): string | null {
  try { const url = new URL(text(value)); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
export function rankTrainingContent(raw: unknown[], goal: string, resources: string[], level: string): TrainingContent[] {
  const keywords: Record<string, RegExp> = { strength: /forca|strength|hipertrof|musculacao/, cardio: /cardio|condicion|endurance|resistencia/, mobility: /mobilidade|mobility|amplitude/, recovery: /recupera|recovery|relaxamento/ };
  const result: TrainingContent[] = [];
  for (const value of raw) {
    const row = record(value), payload = record(row.payload), metadata = { ...payload, ...record(row.metadata), ...row };
    const type = normalized(text(metadata.type) || text(record(metadata.assignable).content_type));
    const kind: ContentKind | null = /^(ebook|ebooks|pdf|livro)$/.test(type) ? 'ebook' : /^(protocol|protocols|protocolo|protocolos|ninemethod|ninemethods|metodo)$/.test(type) ? 'protocol' : /^(infoproduto|infoproduct|infoproducts|curso|course|video|videos|aula)$/.test(type) ? 'learn' : null;
    if (!kind) continue;
    const title = text(metadata.name) || text(metadata.title);
    const objective = text(metadata.objective) || text(metadata.goal);
    const description = text(metadata.shortDescription) || text(metadata.description) || objective;
    const terms = normalized([title,objective,description,termsText(metadata.category),termsText(metadata.tags)].join(' '));
    if (!keywords[goal]?.test(terms)) continue;
    const contentLevel = normalized(text(metadata.level) || text(metadata.difficulty_level));
    if (/beginner|iniciante/.test(normalized(level)) && /advanced|avancado/.test(contentLevel)) continue;
    const equipment = normalized(termsText(metadata.equipment) || termsText(metadata.equipment_needed));
    if (!resources.includes('gym') && ((/academia|gym|maquina|barra/.test(equipment)) || /halter|dumbbell/.test(equipment) && !resources.includes('dumbbells') || /elastic|band/.test(equipment) && !resources.includes('bands'))) continue;
    const url = safeContentUrl(metadata.accessUrl) || safeContentUrl(metadata.playerUrl) || safeContentUrl(metadata.player_url) || safeContentUrl(metadata.url) || safeContentUrl(metadata.detailUrl) || safeContentUrl(metadata.detail_url);
    const locked = metadata.locked === true || metadata.accessGranted === false;
    const score = (keywords[goal]?.test(normalized(objective)) ? 3 : 1) + (contentLevel && contentLevel === normalized(level) ? 1 : 0);
    result.push({ id: text(metadata.id) || text(metadata.slug) || title, title, kind, description, url: locked ? null : url, locked, score });
  }
  return result.sort((a,b) => b.score-a.score || a.title.localeCompare(b.title)).filter((item,index,all) => all.findIndex(other => other.id === item.id) === index);
}
