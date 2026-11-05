export type HealthVideo = {
  id: string;
  external_id: string;
  title: string;
  category?: string;
  thumbnail?: string;
  video_url?: string;
  slug?: string;
  [key: string]: any;
};
export function mergeHealthCatalog(remote: any[], local: any[]): HealthVideo[] {
  const items = new Map<string, HealthVideo>();
  for (const r of remote) {
    const key = String(r.external_id || r.id || r.slug || "");
    if (key)
      items.set(key, {
        ...r,
        id: String(r.id || key),
        external_id: key,
        title: String(r.title || r.name || "Sem título"),
        video_url: r.video_url || r.player_url,
        thumbnail: r.thumbnail || r.thumbnail_url,
      });
  }
  const ordered = [...local].sort(
    (a, b) =>
      Number(!!a.payload?.fitpro_override) -
        Number(!!b.payload?.fitpro_override) ||
      String(a.updated_at || "").localeCompare(String(b.updated_at || "")),
  );
  for (const r of ordered) {
    const key = String(r.external_id || r.id || r.slug || "");
    if (!key) continue;
    if (r.payload?.fitpro_hidden === true) {
      items.delete(key);
      continue;
    }
    const previous = items.get(key);
    items.set(key, {
      ...previous,
      id: String(r.id),
      external_id: key,
      title: r.name || previous?.title || "Sem título",
      category: r.category || previous?.category,
      thumbnail: r.thumbnail_url || previous?.thumbnail,
      video_url: r.player_url || previous?.video_url,
      slug: r.slug || previous?.slug,
      local_id: r.id,
      payload: { ...previous?.payload, ...r.payload },
    });
  }
  return [...items.values()];
}
