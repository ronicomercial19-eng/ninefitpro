import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, ArrowLeft, FileText, Video, Globe, PlayCircle, Layers, BookOpen, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Assignment {
  id: string;
  athlete_id: string;
  content_type: string;
  content_ref: string;
  content_title: string;
  thumbnail_url?: string | null;
  player_url?: string | null;
  access_url?: string | null;
  download_url?: string | null;
  notes?: string | null;
  progress_pct?: number | null;
  completed_at?: string | null;
  payload?: any;
}

const buildIframeSrc = (html: string) => {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  const doc = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
    body{margin:0;padding:16px;font-family:Inter,system-ui,sans-serif;background:hsl(240 5% 5%);color:hsl(0 0% 98%);line-height:1.55}
    h1,h2,h3,h4{color:hsl(18 87% 52%);margin-top:1.2em;font-weight:800;letter-spacing:-0.01em}
    a{color:hsl(213 90% 65%)}
    img,video,iframe{max-width:100%;height:auto;border-radius:10px}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th,td{border:1px solid hsl(0 0% 100% / 0.06);padding:8px 10px;text-align:left}
    th{background:hsl(240 4% 9%)}
  </style></head><body>${clean}</body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(doc)}`;
};

const isImgUrl = (u?: string | null) => !!u && /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(u);

export function ProtocolViewer({ assignment, onBack, onComplete }: {
  assignment: Assignment;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [marking, setMarking] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [embedded, setEmbedded] = useState(false);

  const p = assignment.payload || {};
  const url = assignment.access_url || assignment.player_url || assignment.download_url || p.episodeUrl || p.playerUrl || null;
  const playerUrl = assignment.player_url || p.playerUrl || url;
  const downloadUrl = assignment.download_url || p.downloadUrl || p.pdfUrl || null;
  const hero = isImgUrl(assignment.thumbnail_url) ? assignment.thumbnail_url : (isImgUrl(p.thumbnailUrl) ? p.thumbnailUrl : null);

  const isInfoproduto = assignment.content_type === 'infoproduto' || assignment.content_type === 'sistema' || assignment.content_type === 'app' || assignment.content_type === 'ebook';
  const isPdf = !!url && /\.pdf$/i.test(url);
  const isVideo = assignment.content_type === 'video' || (!!url && /(youtube|vimeo|\.mp4)/i.test(url));

  const modules: any[] = useMemo(() => {
    if (Array.isArray(p.modules)) return p.modules;
    if (Array.isArray(p.estrutura)) return p.estrutura;
    if (Array.isArray(p.structure)) return p.structure;
    return [];
  }, [p]);

  const guidelines: string[] = useMemo(() => {
    if (Array.isArray(p.guidelines)) return p.guidelines;
    if (Array.isArray(p.diretrizes)) return p.diretrizes;
    return [];
  }, [p]);

  useEffect(() => {
    (async () => {
      const u = assignment.access_url || assignment.player_url || assignment.download_url;
      if (assignment.content_type === 'html' || (u && /\.html?$/i.test(u))) {
        try {
          const resp = await fetch(u!);
          setHtmlContent(await resp.text());
        } catch {
          setHtmlContent(`<p>Não foi possível carregar. <a href="${u}" target="_blank">Abrir em nova aba</a></p>`);
        }
      }
      setLoaded(true);
    })();
  }, [assignment.id]);

  const markDone = async () => {
    if (marking) return;
    setMarking(true);
    try {
      const { error } = await supabase
        .from("student_library_assignments")
        .update({ progress_pct: 100, completed_at: new Date().toISOString(), status: 'completed' })
        .eq("id", assignment.id);
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.from("master_registry" as any).insert({
          user_id: user.id,
          event_type: "protocol_completed",
          source: "library",
          payload: { assignment_id: assignment.id, title: assignment.content_title },
        }).then(() => {});
      }
      toast.success("Protocolo concluído.");
      onComplete();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao marcar como concluído");
    } finally {
      setMarking(false);
    }
  };

  // INFOPRODUTO premium view
  if (isInfoproduto) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          {!assignment.completed_at && (
            <Button onClick={markDone} disabled={marking} size="sm" className="bg-primary text-primary-foreground">
              <Check className="w-4 h-4 mr-1" />
              {marking ? "Salvando..." : "Marcar concluído"}
            </Button>
          )}
        </div>

        {/* HERO */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-card via-elevated to-card aspect-[16/9] flex items-end">
          {hero && <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="relative p-5 w-full">
            <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-semibold mb-1">
              {assignment.content_type} • PROTOCOLO ELITE
            </p>
            <h2 className="text-3xl font-black tracking-tight leading-none mb-2">
              {assignment.content_title}
            </h2>
            <div className="flex gap-3 text-xs text-white/70">
              {modules.length > 0 && <span>{modules.length} módulos</span>}
              {p.duration && <span>{p.duration}</span>}
              {p.level && <span>Nível: {p.level}</span>}
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="grid grid-cols-1 gap-2">
          {playerUrl && (
            <Button
              onClick={() => setEmbedded(true)}
              className="h-14 bg-primary text-primary-foreground text-base font-bold tracking-wide"
            >
              <PlayCircle className="w-5 h-5 mr-2" /> ABRIR PLAYER
            </Button>
          )}
          {playerUrl && (
            <a href={playerUrl} target="_blank" rel="noreferrer"
              className="h-11 rounded-md border border-white/10 hover:border-primary/40 flex items-center justify-center text-sm gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="w-4 h-4" /> Abrir em nova aba
            </a>
          )}
          {downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noreferrer"
              className="h-11 rounded-md border border-white/10 hover:border-primary/40 flex items-center justify-center text-sm gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Download className="w-4 h-4" /> Download
            </a>
          )}
        </div>

        {embedded && playerUrl && (
          <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-black">
            <iframe
              src={playerUrl}
              className="w-full h-[78vh]"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              sandbox="allow-scripts allow-forms allow-popups"
              title={assignment.content_title}
            />
            <p className="text-[10px] text-muted-foreground px-3 py-2 text-center">
              Player não carregou? <a href={playerUrl} target="_blank" rel="noreferrer" className="text-primary underline">Abra em nova aba</a>.
            </p>
          </div>
        )}

        {assignment.notes && (
          <div className="surface-card p-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Coach</p>
            <p className="text-sm">{assignment.notes}</p>
          </div>
        )}

        {modules.length > 0 && (
          <div className="surface-card p-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3 flex items-center gap-2">
              <Layers className="w-3 h-3" /> Estrutura
            </p>
            <ol className="space-y-2">
              {modules.map((m: any, i: number) => (
                <li key={i} className="flex gap-3 items-start text-sm">
                  <span className="text-primary font-bold w-6 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">
                    {typeof m === 'string' ? m : (m?.title || m?.name || m?.label || JSON.stringify(m))}
                    {m?.duration && <span className="text-muted-foreground text-xs ml-2">{m.duration}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {guidelines.length > 0 && (
          <div className="surface-card p-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3 flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Diretrizes
            </p>
            <ul className="space-y-1.5 text-sm">
              {guidelines.map((g, i) => (
                <li key={i} className="flex gap-2"><span className="text-primary">·</span><span>{g}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Fallback (html / pdf / video / external)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        {!assignment.completed_at && (
          <Button onClick={markDone} disabled={marking} className="bg-primary text-primary-foreground">
            <Check className="w-4 h-4 mr-1" />
            {marking ? "Salvando..." : "Marcar concluído"}
          </Button>
        )}
      </div>

      <div className="surface-card p-4">
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">{assignment.content_type}</p>
        <h2 className="text-2xl font-black tracking-tight mb-2">{assignment.content_title}</h2>
        {assignment.notes && <p className="text-sm text-muted-foreground">{assignment.notes}</p>}
      </div>

      {!loaded && <div className="h-64 surface-card animate-pulse" />}

      {loaded && htmlContent && (
        <iframe
          src={buildIframeSrc(htmlContent)}
          className="w-full h-[70vh] rounded-xl bg-card border border-white/[0.06]"
          sandbox="allow-scripts"
          title={assignment.content_title}
        />
      )}

      {loaded && !htmlContent && isPdf && url && (
        <iframe src={url} className="w-full h-[80vh] rounded-xl bg-card border border-white/[0.06]" title={assignment.content_title} />
      )}

      {loaded && !htmlContent && !isPdf && isVideo && url && (
        <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/[0.06]">
          <iframe
            src={url.replace('watch?v=', 'embed/')}
            className="w-full h-full"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={assignment.content_title}
          />
        </div>
      )}

      {loaded && !htmlContent && !isPdf && !isVideo && url && (
        <a href={url} target="_blank" rel="noreferrer"
           className="surface-card p-6 flex items-center gap-3 hover:border-primary/40 transition-colors block">
          <ExternalLink className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">Abrir conteúdo</p>
            <p className="text-xs text-muted-foreground truncate">{url}</p>
          </div>
        </a>
      )}

      {loaded && !htmlContent && !url && (
        <div className="surface-card p-6 text-sm text-muted-foreground">
          Conteúdo sem mídia anexada. RON está observando.
        </div>
      )}
    </div>
  );
}

export function ProtocolListItem({ a, onOpen }: { a: Assignment; onOpen: () => void }) {
  const Icon = a.content_type === 'video' ? Video : a.content_type === 'pdf' || a.content_type === 'ebook' ? FileText : Globe;
  const hasImg = isImgUrl(a.thumbnail_url);
  return (
    <button
      onClick={onOpen}
      className="w-full surface-card p-3 flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
    >
      <div className="w-14 h-14 rounded-lg bg-elevated border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
        {hasImg
          ? <img src={a.thumbnail_url!} alt="" className="w-full h-full object-cover" />
          : <Icon className="w-5 h-5 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-0.5">{a.content_type}</p>
        <p className="text-sm font-semibold truncate">{a.content_title}</p>
        {a.notes && <p className="text-xs text-muted-foreground truncate">{a.notes}</p>}
      </div>
      {a.completed_at ? (
        <span className="text-[10px] font-semibold text-primary">CONCLUÍDO</span>
      ) : (
        <span className="text-[10px] font-semibold text-muted-foreground">ABRIR →</span>
      )}
    </button>
  );
}
