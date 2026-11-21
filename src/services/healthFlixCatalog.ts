import { homeQuery, normalizeHome } from '@/lib/healthFlixHome';
import { supabase } from "@/integrations/supabase/client";
import { mergeHealthCatalog } from "@/lib/healthFlixCatalog";
export type { HealthVideo } from "@/lib/healthFlixCatalog";
export const loadHealthFlixCatalog = () => loadHealthFlixHomeCatalog();
export async function loadHealthFlixHomeCatalog(athleteId?: string | null) {
  let query = new URLSearchParams({ action: 'content' });
  if (athleteId) {
    const { data } = await supabase.from('athletes').select('primary_goal,objetivo,training_level,nivel,session_duration').eq('id', athleteId).maybeSingle();
    query = homeQuery(data);
  }
  const [upstream, local] = await Promise.all([
    supabase.functions.invoke(`healthflix-proxy?${query}`, {
      method: "GET" as any,
    }).then(async result => {
      if (athleteId && (result.error || (!Array.isArray(result.data?.rows) && !Array.isArray(result.data?.items) && !result.data?.hero?.item))) {
        return supabase.functions.invoke('healthflix-proxy?action=content', { method: 'GET' });
      }
      return result;
    }).catch(() => null),
    (async () => {
      const rows: any[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("library_items")
          .select(
            "id,external_id,name,category,thumbnail_url,player_url,slug,payload,updated_at",
          )
          .in("type", ["videos", "video", "streaming", "aula"])
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data || []));
        if ((data || []).length < 500) break;
      }
      return rows;
    })(),
  ]);
  const homeValid = !!upstream && !upstream.error && upstream.data?.success !== false && (Array.isArray(upstream.data?.rows) || upstream.data?.hero?.item);
  let remoteItems = homeValid ? [upstream.data?.hero?.item, ...(upstream.data.rows || []).flatMap((row: any) => row.items || [])].filter(Boolean) : upstream?.data?.items;
  if (homeValid) {
    // The curated rows can be a subset. Keep the full catalogue available to search and filters.
    const list = await supabase.functions.invoke('healthflix-proxy?action=content', { method: 'GET' }).catch(() => null);
    if (list && !list.error && Array.isArray(list.data?.items)) remoteItems = [...list.data.items, ...remoteItems];
  }
  const valid =
    !!upstream && !upstream.error &&
    Array.isArray(remoteItems) &&
    upstream.data?.success !== false;
  if (!valid && !local.length)
    throw new Error(
      "Catálogo externo indisponível e nenhum vídeo local publicado.",
    );
  const items = mergeHealthCatalog(valid ? remoteItems : [], local);
  return {
    items,
    home: normalizeHome(homeValid ? upstream?.data : { facets: upstream?.data?.facets }, items),
    hiddenItems: mergeHealthCatalog(
      [],
      local
        .filter((r) => r.payload?.fitpro_hidden === true)
        .map((r) => ({
          ...r,
          payload: { ...r.payload, fitpro_hidden: false },
        })),
    ),
    externalAvailable: valid,
  };
}
