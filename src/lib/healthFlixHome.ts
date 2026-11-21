import { mergeHealthCatalog, type HealthVideo } from './healthFlixCatalog';
export type HealthHome = {
  hero: { label: string; cta: string; item: HealthVideo } | null;
  rows: { key: string; title: string; items: HealthVideo[] }[];
  facets: Record<string, unknown>;
};
export const contentId = (item: { id: string; external_id?: string | null; play?: { content_id?: string | number } }) => String(item.play?.content_id ?? item.external_id ?? item.id);
export function normalizeHome(data: any, items: HealthVideo[]): HealthHome {
  const lookup = new Map(items.map(item => [String(item.external_id || item.id), item]));
  const resolve = (raw: any) => {
    const item = mergeHealthCatalog([raw], [])[0];
    return item ? lookup.get(item.external_id) : undefined;
  };
  const heroItem = data?.hero?.item && resolve(data.hero.item);
  return {
    hero: heroItem ? { label: String(data.hero.label || 'Treino de hoje'), cta: String(data.hero.cta || 'Começar treino'), item: heroItem } : null,
    rows: (Array.isArray(data?.rows) ? data.rows : []).flatMap((row: any) => {
      const entries = (Array.isArray(row.items) ? row.items : []).map(resolve).filter(Boolean) as HealthVideo[];
      return entries.length ? [{ key: String(row.key), title: String(row.title || 'Seus treinos'), items: entries }] : [];
    }),
    facets: data?.facets && typeof data.facets === 'object' ? data.facets : {},
  };
}
export function homeQuery(profile: { primary_goal?: string | null; objetivo?: string | null; training_level?: string | null; nivel?: string | null; session_duration?: string | null } | null) {
  const query = new URLSearchParams({ action: 'content', view: 'home' });
  const fold = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '_');
  const goal = fold(profile?.primary_goal || profile?.objetivo || '');
  const level = fold(profile?.training_level || profile?.nivel || '');
  if (['emagrecimento','hipertrofia','condicionamento','mobilidade','bem_estar'].includes(goal)) query.set('goal', goal);
  if (['iniciante','intermediario','avancado'].includes(level)) query.set('level', level);
  const duration = profile?.session_duration?.match(/^(\d+)(?:\s*min(?:utos?)?)?$/i);
  if (duration && Number(duration[1]) > 0 && Number(duration[1]) <= 240) query.set('minutes', duration[1]);
  return query;
}
export function healthEmbedUrl(raw: unknown, id: string): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.hostname !== 'healthflixnine.lovable.app' || !url.pathname.startsWith('/embed')) return null;
    url.searchParams.set('content_id', id);
    return url.toString();
  } catch { return null; }
}

export function facetOptions(facets: Record<string, unknown>, key: 'modality' | 'objective' | 'level'): { value: string; count: number | null }[] {
  const raw = facets[key] ?? facets[`${key === 'modality' ? 'modalities' : key === 'objective' ? 'objectives' : 'levels'}`];
  if (Array.isArray(raw)) return raw.flatMap(entry => {
    const value = typeof entry === 'string' ? entry : entry?.key ?? entry?.value ?? entry?.name;
    return value ? [{ value: String(value), count: Number.isFinite(Number(entry?.count)) ? Number(entry.count) : null }] : [];
  });
  if (raw && typeof raw === 'object') return Object.entries(raw).map(([value,count]) => ({ value, count: Number.isFinite(Number(count)) ? Number(count) : null }));
  return [];
}
