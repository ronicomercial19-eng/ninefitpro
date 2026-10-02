import { supabase } from '@/integrations/supabase/client';
import { rankTrainingContent } from './quickTrainingContentRules';
export type { TrainingContent } from './quickTrainingContentRules';
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export async function loadTrainingContent(athleteId: string, goal: string, resources: string[], level: string) {
  const remote = await supabase.functions.invoke(`library-full-proxy?student_external_id=${encodeURIComponent(athleteId)}`, { method: 'GET' });
  let source: unknown[] = [];
  if (!remote.error) {
    const payload = record(record(remote.data).data ?? remote.data);
    source = Array.isArray(payload.items) ? payload.items : [];
    for (const [key,section] of Object.entries(record(payload.sections))) {
      const items = record(section).items;
      if (Array.isArray(items)) source.push(...items.map(item => ({ type:key,...record(item) })));
    }
  }
  if (!source.length) {
    const cached = await supabase.from('library_items').select('id,type,name,category,payload,player_url,slug').in('type', ['infoproduto','infoproducts','ebook','ebooks','pdf','video','videos','protocolo','protocol','nineMethods','ninemethods','metodo']).limit(500);
    if (cached.error) throw cached.error;
    source = cached.data || [];
  }
  return rankTrainingContent(source,goal,resources,level);
}
