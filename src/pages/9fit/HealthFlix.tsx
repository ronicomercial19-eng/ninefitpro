import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePredictiveContext } from "@/hooks/usePredictiveContext";
import { Play, Film } from "lucide-react";
import { motion } from "framer-motion";

interface Vid { external_id: string; name: string; thumbnail_url?: string | null; player_url?: string | null; }

export default function NineFitHealthFlix() {
  const { snapshot } = usePredictiveContext();
  const [videos, setVideos] = useState<Vid[]>([]);
  const [playing, setPlaying] = useState<Vid | null>(null);

  useEffect(() => {
    (async () => {
      let q = supabase.from("library_items" as any).select("external_id, name, thumbnail_url, player_url, type").eq("type", "videos").limit(40);
      const { data } = await q;
      let list = ((data as any) || []) as Vid[];
      if (snapshot.flags.includes("prioritize_elastic")) {
        list = [...list].sort((a, b) => {
          const A = a.name.toLowerCase().includes("elást") ? -1 : 0;
          const B = b.name.toLowerCase().includes("elást") ? -1 : 0;
          return A - B;
        });
      }
      setVideos(list);
    })();
  }, [snapshot.flags.join(",")]);

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // HEALTHFLIX</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">STREAMING ELITE</h1>
        {snapshot.flags.includes("prioritize_elastic") && (
          <p className="text-xs text-primary mt-1">Conteúdo de elásticos priorizado pelo Banco Supremo.</p>
        )}
      </div>

      {playing && (
        <div className="px-4 mb-4">
          <div className="aspect-video rounded-xl overflow-hidden bg-black border border-primary/30">
            {playing.player_url ? (
              <iframe src={playing.player_url} className="w-full h-full" allow="autoplay; fullscreen" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sem player</div>
            )}
          </div>
          <p className="text-sm text-foreground mt-2">{playing.name}</p>
        </div>
      )}

      <div className="px-4 grid grid-cols-2 gap-3">
        {videos.length === 0 && (
          <div className="col-span-2 glass-mission rounded-xl p-6 flex flex-col items-center text-center">
            <Film className="w-6 h-6 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Sincronize a biblioteca para popular o catálogo.</p>
          </div>
        )}
        {videos.map((v, i) => (
          <motion.button
            key={v.external_id}
            onClick={() => setPlaying(v)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass-mission rounded-xl overflow-hidden text-left"
          >
            <div className="aspect-video bg-white/[0.03] flex items-center justify-center relative">
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Film className="w-6 h-6 text-muted-foreground" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                <Play className="w-8 h-8 text-primary" />
              </div>
            </div>
            <p className="text-xs text-foreground px-2 py-2 line-clamp-2">{v.name}</p>
          </motion.button>
        ))}
      </div>

      <BottomNavigation />
    </div>
  );
}
