import { supabase } from "@/integrations/supabase/client";
import { mergeHealthCatalog } from "@/lib/healthFlixCatalog";
export type { HealthVideo } from "@/lib/healthFlixCatalog";
export async function loadHealthFlixCatalog() {
  const [upstream, local] = await Promise.all([
    supabase.functions.invoke("healthflix-proxy?action=content", {
      method: "GET" as any,
    }),
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
  const valid =
    !upstream.error &&
    Array.isArray(upstream.data?.items) &&
    upstream.data?.success !== false;
  if (!valid && !local.length)
    throw new Error(
      "Catálogo externo indisponível e nenhum vídeo local publicado.",
    );
  return {
    items: mergeHealthCatalog(valid ? upstream.data.items : [], local),
    externalAvailable: valid,
  };
}
