import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileJson, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RawSkill {
  slug?: unknown;
  name?: unknown;
  description?: unknown;
  category?: unknown;
  tags?: unknown;
  version?: unknown;
  status?: unknown;
  content?: unknown;
}

interface SkillPayload {
  slug: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  version: number;
  status: string;
  content: Record<string, unknown>;
}

/**
 * Upload de Skills via arquivo JSON.
 * Aceita um objeto { slug, name, category, description?, tags?, content }
 * ou um array desses. Faz upsert por `slug`.
 */
export function SkillUploader({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const handleFile = async (f: File) => {
    setBusy(true); setCount(null);
    try {
      const txt = await f.text();
      const raw: unknown = JSON.parse(txt);
      const list = (Array.isArray(raw) ? raw : [raw])
        .filter((s): s is RawSkill => typeof s === "object" && s !== null && "slug" in s && "name" in s);
      if (!list.length) { toast.error("Nenhuma skill válida no arquivo"); return; }

      const payload: SkillPayload[] = list.map((s) => ({
        slug: String(s.slug),
        name: String(s.name),
        description: typeof s.description === "string" ? s.description : null,
        category: typeof s.category === "string" ? s.category : "general",
        tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
        version: Number(s.version) || 1,
        status: typeof s.status === "string" ? s.status : "draft",
        content: typeof s.content === "object" && s.content !== null && !Array.isArray(s.content) ? s.content as Record<string, unknown> : {},
      }));

      const { error } = await supabase
        .from("skills")
        .upsert(payload as any, { onConflict: "slug" });

      if (error) throw error;
      setCount(payload.length);
      toast.success(`${payload.length} skill(s) importadas`);
      onDone?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao importar JSON";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 flex items-center gap-3">
      <FileJson className="w-6 h-6 text-primary shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold">Upload de Skills (JSON)</p>
        <p className="text-xs text-muted-foreground">
          Aceita objeto ou array com <code className="font-mono">slug, name, category, content</code>.
        </p>
        {count !== null && (
          <p className="text-xs text-primary mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {count} importada(s)
          </p>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        Importar
      </Button>
    </div>
  );
}
