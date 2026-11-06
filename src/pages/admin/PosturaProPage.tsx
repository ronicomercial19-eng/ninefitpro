import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { signedAssessmentUrl } from "@/lib/privateMedia";
import { useRef } from "react";
import { useEffect, useState } from "react";
import {
  Activity,
  ScanLine,
  Upload,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ApiConnectorCard } from "@/components/admin/ApiConnectorCard";
import { PosturaResult } from "@/components/postura/PosturaResult";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Scan {
  id: string;
  status: string;
  created_at: string;
  result: any;
  front_url?: string | null;
  back_url?: string | null;
  left_url?: string | null;
  right_url?: string | null;
}

const SIDES = ["front", "back", "left", "right"] as const;
type Side = (typeof SIDES)[number];

const SIDE_LABELS: Record<Side, string> = {
  front: "Frente",
  back: "Costas",
  left: "Lado esquerdo",
  right: "Lado direito",
};

function ComparisonPhoto({ scan, side, label }: { scan: Scan; side: Side; label: string }) {
  const path = scan[`${side}_url`];
  const [url, setUrl] = useState<string | null>(side === "front" ? path ?? null : null);
  const [loading, setLoading] = useState(Boolean(path && side !== "front"));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!path || side === "front") return;
    let active = true;
    void signedAssessmentUrl(path)
      .then((value) => { if (active) setUrl(value); })
      .catch(() => { if (active) setUrl(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, side]);

  return (
    <figure className="nine-core-posture-photo">
      <figcaption>
        <span className="nine-core-kicker">{label}</span>
        <time dateTime={scan.created_at}>
          {new Date(scan.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </time>
      </figcaption>
      <div className="nine-core-posture-frame">
        {url && !failed ? (
          <img src={url} alt={`${SIDE_LABELS[side]} · ${label}`} onError={() => setFailed(true)} />
        ) : (
          <p role="status">{loading ? "Carregando foto…" : "Foto indisponível neste ângulo."}</p>
        )}
      </div>
    </figure>
  );
}

function PostureComparison({ scans }: { scans: Scan[] }) {
  const [side, setSide] = useState<Side>("front");
  const [referenceId, setReferenceId] = useState("");
  const current = scans[0];
  const references = scans.slice(1);
  const reference = references.find((scan) => scan.id === referenceId) ?? references[0];
  if (!current) return null;

  return (
    <section className="nine-core-posture" aria-labelledby="posture-comparison-title">
      <header>
        <div>
          <p className="nine-core-kicker">Histórico visual</p>
          <h2 id="posture-comparison-title">Compare o mesmo ângulo</h2>
        </div>
        {reference && (
          <label className="text-sm">
            Avaliação de referência
            <select className="ml-2 rounded border bg-background p-2" value={reference.id} onChange={(event) => setReferenceId(event.target.value)}>
              {references.map((scan) => <option key={scan.id} value={scan.id}>{new Date(scan.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</option>)}
            </select>
          </label>
        )}
      </header>
      <div className="nine-core-posture-angles" role="group" aria-label="Ângulo da comparação">
        {SIDES.map((value) => (
          <Button key={value} type="button" size="sm" variant="outline" aria-pressed={side === value} onClick={() => setSide(value)}>
            {SIDE_LABELS[value]}
          </Button>
        ))}
      </div>
      <div className="nine-core-posture-pair">
        {reference && <ComparisonPhoto key={`${reference.id}:${side}`} scan={reference} side={side} label="Referência" />}
        <ComparisonPhoto key={`${current.id}:${side}`} scan={current} side={side} label="Mais recente" />
      </div>
      <p className="text-sm text-muted-foreground">
        {reference ? "Compare fotos feitas com enquadramento e distância semelhantes." : "Adicione outra avaliação para comparar as duas datas."}
      </p>
    </section>
  );
}
export default function PosturaProPage({ studentId }: { studentId?: string } = {}) {
  const { user } = useAuth();
  const workspace = useProfessorWorkspace();
  const athleteId = studentId ?? workspace.athleteId;
  const revision = useRef(0);
  const writing = useRef(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<Partial<Record<Side, File>>>({});
  const [uploading, setUploading] = useState(false);
  const [scanHistory, setScanHistory] = useState<{ athleteId: string; scans: Scan[] } | null>(null);
  const scans = scanHistory?.athleteId === athleteId ? scanHistory?.scans ?? [] : [];
  const [running, setRunning] = useState<string | null>(null);

  async function load() {
    const request = ++revision.current;
    setScanHistory(null);
    setLoadError(false);
    if (!athleteId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("postura_scans")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      if (request === revision.current) {
        setLoadError(true);
        setLoading(false);
      }
      return;
    }
    const rows = await Promise.all(
      (data ?? []).map(async (row) => ({
        ...row,
        front_url: row.front_url
          ? await signedAssessmentUrl(row.front_url)
          : null,
      })),
    );
    if (request === revision.current) {
      setScanHistory({ athleteId, scans: rows as Scan[] });
      setLoading(false);
    }
  }
  useEffect(() => {
    setFiles({});
    void load();
    return () => {
      revision.current++;
    };
  }, [athleteId]);
  async function runScan(id: string) {
    const { data, error } = await supabase.functions.invoke(
      "postura-pro-scan",
      { body: { scan_id: id } },
    );
    if (error || data?.error)
      throw new Error(
        data?.error || "Análise não concluída. Você pode tentar novamente.",
      );
    const { data: confirmed, error: readError } = await supabase
      .from("postura_scans")
      .select("status")
      .eq("id", id)
      .single();
    if (readError || confirmed.status !== "done")
      throw new Error("O serviço ainda não confirmou a conclusão.");
  }
  async function retryScan(id: string) {
    if (writing.current) return;
    writing.current = true;
    setRunning(id);
    try {
      await runScan(id);
      toast.success("Análise concluída. Revise o resultado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      writing.current = false;
      setRunning(null);
      void load();
    }
  }

  async function uploadAndScan() {
    if (!user || !athleteId)
      return toast.error("Selecione o aluno antes de enviar fotos.");
    if (writing.current) return;
    const missing = SIDES.filter((s) => !files[s]);
    if (missing.length)
      return toast.error(`Faltam fotos: ${missing.join(", ")}`);

    writing.current = true;
    setUploading(true);
    try {
      const urls: any = {};
      for (const side of SIDES) {
        const f = files[side]!;
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > 10 * 1024 * 1024
        )
          throw new Error("Use JPEG, PNG ou WebP de até 10 MB.");
        const path = `${athleteId}/${crypto.randomUUID()}_${side}`;
        const { error } = await supabase.storage
          .from("assessments")
          .upload(path, f, { upsert: true });
        if (error) throw error;
        urls[`${side}_url`] = path;
      }
      const { data: scan, error: insErr } = await supabase
        .from("postura_scans" as any)
        .insert({
          user_id: user.id,
          athlete_id: athleteId,
          ...urls,
          status: "pending",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      setRunning((scan as any).id);
      await runScan((scan as any).id);
      toast.success("Análise postural concluída!");
      setFiles({});
      load();
    } catch (e: any) {
      toast.error(e?.message || "Erro no upload/análise");
    } finally {
      writing.current = false;
      setUploading(false);
      setRunning(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase tracking-tight flex items-center gap-3">
          <Activity className="w-7 h-7 text-primary" /> Postura Pro Analyzer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie 4 fotos (frente, costas, lado esquerdo, lado direito) — a
          análise educativa será vinculada ao aluno selecionado e deverá ser
          revisada pelo profissional.
        </p>
      </div>

      {!studentId && <ApiConnectorCard
        moduleKey="postura_pro"
        title="Postura Pro Analyzer API"
        description="Conecte o serviço externo de análise postural para laudos completos."
        icon={ScanLine}
        endpointPlaceholder="https://api.posturapro.example.com/v1"
        healthPath="/health"
      />}

      <Card className="border-primary/30">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-display text-lg">Novo Scan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SIDES.map((side) => (
              <label
                key={side}
                className="cursor-pointer border-2 border-dashed border-primary/30 rounded-xl p-4 text-center hover:bg-primary/5 transition"
              >
                <Upload className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-xs uppercase font-bold">
                  {side === "front"
                    ? "Frente"
                    : side === "back"
                      ? "Costas"
                      : side === "left"
                        ? "Lado Esq."
                        : "Lado Dir."}
                </p>
                {files[side] && (
                  <p className="text-[10px] text-emerald-400 mt-1 truncate">
                    ✓ {files[side]!.name}
                  </p>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
                      event.target.value = "";
                      toast.error("Use JPEG, PNG ou WebP de até 10 MB.");
                      return;
                    }
                    setFiles(current => ({ ...current, [side]: file }));
                  }}
                />
              </label>
            ))}
          </div>
          <Button
            onClick={uploadAndScan}
            disabled={uploading || !athleteId || !!running || SIDES.some(side => !files[side])}
            className="w-full"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ScanLine className="w-4 h-4 mr-2" />
            )}
            {running ? "Processando IA postural..." : "Analisar postura"}
          </Button>
        </CardContent>
      </Card>

      <PostureComparison key={athleteId} scans={scans.filter((scan) => scan.status === "done")} />

      <div className="space-y-3">
        <h3 className="text-sm uppercase tracking-widest text-primary font-bold">
          Histórico
        </h3>
        {loadError ? (
          <p role="alert">
            Não foi possível carregar as análises.{" "}
            <button onClick={() => void load()}>Tentar novamente</button>
          </p>
        ) : loading ? (
          <p>Carregando análises…</p>
        ) : scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum scan ainda.</p>
        ) : (
          scans.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-start gap-4">
                {s.front_url && (
                  <img
                    src={s.front_url}
                    alt=""
                    className="w-16 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={s.status === "done" ? "default" : "outline"}
                    >
                      {s.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("pt-BR")}
                    </span>
                    {s.status === "done" &&
                      typeof s.result?.score === "number" && (
                        <Badge className="bg-emerald-500/15 text-emerald-400">
                          Score {s.result.score}
                        </Badge>
                      )}
                  </div>
                  {s.status !== "done" && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {s.result?.error || "Análise ainda não concluída."}
                      </p>
                      <Button
                        variant="outline"
                        disabled={!!running}
                        onClick={() => void retryScan(s.id)}
                      >
                        Tentar analisar novamente
                      </Button>
                    </div>
                  )}
                  {s.status === "done" && (
                    <PosturaResult result={s.result} variant="professor" />
                  )}
                  {s.status === "done" && s.result?.summary && (
                    <p className="text-sm text-foreground/80">
                      {s.result.summary}
                    </p>
                  )}
                  {s.status === "done" && Array.isArray(s.result?.findings) && (
                    <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                      {s.result.findings
                        .slice(0, 3)
                        .map((f: any, i: number) => (
                          <li key={i}>
                            • <b>{f.region}:</b> {f.note} ({f.severity})
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
