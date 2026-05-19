import { useState } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, ArrowLeft, FileText, Video, Globe } from "lucide-react";
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
}

const buildIframeSrc = (html: string) => {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  const doc = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
    body{margin:0;padding:16px;font-family:Inter,system-ui,sans-serif;background:#0B0B0D;color:#FAFAFA;line-height:1.5}
    h1,h2,h3,h4{color:#F05C1A;margin-top:1.2em}
    a{color:#4DA3FF}
    img,video,iframe{max-width:100%;height:auto;border-radius:8px}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th,td{border:1px solid #2A2A2D;padding:6px 8px;text-align:left}
    th{background:#1C1C1F}
  </style></head><body>${clean}</body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(doc)}`;
};

export function ProtocolViewer({ assignment, onBack, onComplete }: {
  assignment: Assignment;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [marking, setMarking] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Fetch html content if content_ref looks like html assignment
  useState(() => {
    (async () => {
      const url = assignment.access_url || assignment.player_url || assignment.download_url;
      if (assignment.content_type === 'html' || (url && /\.html?$/i.test(url))) {
        try {
          const resp = await fetch(url!);
          const txt = await resp.text();
          setHtmlContent(txt);
        } catch {
          setHtmlContent(`<p>Não foi possível carregar o conteúdo. <a href="${url}" target="_blank">Abrir em nova aba</a></p>`);
        }
      }
      setLoaded(true);
    })();
  });

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
      toast.success("Protocolo concluído!");
      onComplete();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao marcar como concluído");
    } finally {
      setMarking(false);
    }
  };

  const url = assignment.access_url || assignment.player_url || assignment.download_url;
  const isPdf = url && /\.pdf$/i.test(url);
  const isVideo = assignment.content_type === 'video' || (url && /(youtube|vimeo|\.mp4)/i.test(url));

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
        <p className="text-label mb-1">{assignment.content_type}</p>
        <h2 className="text-display text-xl mb-2">{assignment.content_title}</h2>
        {assignment.notes && <p className="text-sm text-muted-foreground">{assignment.notes}</p>}
      </div>

      {!loaded && <div className="h-64 surface-card animate-pulse" />}

      {loaded && htmlContent && (
        <iframe
          src={buildIframeSrc(htmlContent)}
          className="w-full h-[70vh] rounded-xl bg-card border border-white/5"
          sandbox="allow-scripts allow-same-origin"
          title={assignment.content_title}
        />
      )}

      {loaded && !htmlContent && isPdf && url && (
        <iframe src={url} className="w-full h-[80vh] rounded-xl bg-card border border-white/5" title={assignment.content_title} />
      )}

      {loaded && !htmlContent && !isPdf && isVideo && url && (
        <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/5">
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
            <p className="font-semibold">Abrir conteúdo externo</p>
            <p className="text-xs text-muted-foreground truncate">{url}</p>
          </div>
        </a>
      )}

      {loaded && !htmlContent && !url && (
        <div className="surface-card p-6 text-sm text-muted-foreground">
          Conteúdo sem mídia anexada. Entre em contato com seu coach.
        </div>
      )}
    </div>
  );
}

export function ProtocolListItem({ a, onOpen }: { a: Assignment; onOpen: () => void }) {
  const Icon = a.content_type === 'video' ? Video : a.content_type === 'pdf' ? FileText : Globe;
  return (
    <button
      onClick={onOpen}
      className="w-full surface-card p-3 flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
    >
      <div className="w-14 h-14 rounded-lg bg-elevated border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
        {a.thumbnail_url
          ? <img src={a.thumbnail_url} alt="" className="w-full h-full object-cover" />
          : <Icon className="w-5 h-5 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label mb-0.5">{a.content_type}</p>
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
