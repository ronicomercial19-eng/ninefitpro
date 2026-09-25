import { useEffect, useState } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAthleteId } from "@/hooks/useAthleteId";
import { BookOpen, Loader2, ExternalLink, Lock, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface LibItem {
  id?: string;
  title?: string;
  name?: string;
  category?: string;
  type?: string;
  thumbnail?: string | null;
  cover?: string | null;
  url?: string | null;
  detail_url?: string | null;
  playerUrl?: string | null;
  detailUrl?: string | null;
  locked?: boolean;
  tier?: string;
  assigned?: boolean;
  completed?: boolean;
}

const sections = ["videos", "infoproducts", "apps", "nineMethods", "challenges", "assessments", "certifications"] as const;
const labels: Record<string, string> = { videos: "Vídeos", infoproducts: "Infoprodutos", apps: "Apps", nineMethods: "Métodos", challenges: "Desafios", assessments: "Avaliações", certifications: "Certificações" };

export default function NineFitBiblioteca() {
  const { athleteId, error: athleteError } = useAthleteId();
  const [items, setItems] = useState<LibItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]>("videos");
  const [tier, setTier] = useState("bronze");

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke(`library-full-proxy?student_external_id=${encodeURIComponent(athleteId)}&section=${activeSection}`, { method: "GET" });
        if (invokeError) throw invokeError;
        const payload = data as any;
        setTier(payload?.userTier || payload?.student?.tier || "bronze");
        setItems(payload?.sections?.[activeSection]?.items || []);
      } catch (e: any) {
        setError(true);
        toast.error("Biblioteca indisponível agora");
      } finally {
        setLoading(false);
      }
    })();
  }, [athleteId, reloadKey, activeSection]);

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // BIBLIOTECA</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">BIBLIOTECA 9FIT</h1>
        <p className="text-xs text-muted-foreground mt-1">Acervo nativo · plano {tier}</p>
      </div>

      <div className="px-4 mb-5 flex gap-2 overflow-x-auto scrollbar-hide">{sections.map((section) => <button key={section} type="button" onClick={() => setActiveSection(section)} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider ${activeSection === section ? "border-primary bg-primary text-primary-foreground" : "border-white/10 text-muted-foreground"}`}>{labels[section]}</button>)}</div>

      {athleteError && (
        <div className="px-4 mb-4">
          <div className="glass-mission rounded-xl p-4 text-center">
            <p className="text-xs">{athleteError}</p>
          </div>
        </div>
      )}

      <div className="px-4 grid grid-cols-2 gap-3">
        {loading && (
          <div className="col-span-2 flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
        {!loading && error && (
          <div className="col-span-2 glass-mission rounded-xl p-6 flex flex-col items-center text-center">
            <BookOpen className="w-6 h-6 text-destructive mb-2" />
            <p className="text-xs text-muted-foreground">Não foi possível carregar sua biblioteca.</p>
            <button onClick={() => setReloadKey((k) => k + 1)} className="mt-3 rounded-lg border border-primary/40 px-4 py-2 text-xs text-primary">Tentar novamente</button>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="col-span-2 glass-mission rounded-xl p-6 flex flex-col items-center text-center">
            <BookOpen className="w-6 h-6 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Sem conteúdos atribuídos ainda.</p>
          </div>
        )}
        {items.map((it, i) => {
          const title = it.title || it.name || "Sem título";
          const thumb = it.thumbnail || it.cover || null;
          const url = it.playerUrl || it.url || it.detailUrl || it.detail_url || null;
          const locked = Boolean(it.locked);
          return (
            <motion.a
              key={(it.id || title) + i}
              href={locked ? "/9fit/planos" : url || undefined}
              aria-disabled={!locked && !url}
              onClick={!locked && !url ? (event) => event.preventDefault() : undefined}
              target={!locked && url ? "_blank" : undefined}
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
              className={`glass-mission rounded-xl overflow-hidden block ${locked ? "opacity-60" : ""}`}
            >
              <div className="aspect-video bg-white/[0.03] flex items-center justify-center">
                {thumb ? (
                  <img src={thumb} alt={title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  locked ? <Lock className="w-6 h-6 text-muted-foreground" /> : it.playerUrl ? <Play className="w-6 h-6 text-primary" /> : <BookOpen className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="px-2 py-2">
                <p className="text-xs text-foreground line-clamp-2">{title}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-widest flex items-center gap-1">
                  {locked ? `Disponível no plano ${it.tier || "superior"}` : it.assigned ? <><CheckCircle2 className="w-2.5 h-2.5 text-primary" /> Atribuído</> : it.category || it.type || "conteúdo"} {!locked && url && <ExternalLink className="w-2.5 h-2.5" />}
                </p>
              </div>
            </motion.a>
          );
        })}
      </div>

      <BottomNavigation />
    </div>
  );
}
