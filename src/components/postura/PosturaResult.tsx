// Renderiza o resultado do fitpro-analyze (Postura Pro).
// Formato: { status, macro_diagnosis, segments, myofascial_lines, recovery_protocol, postural_archetype }
// variant="professor": dados técnicos completos. variant="aluno": leitura simplificada.

type Variant = "professor" | "aluno";

const SEGMENT_LABELS: Record<string, string> = {
  cervical: "Cervical",
  shoulders: "Ombros",
  pelvis: "Pelve",
};

const PHASES: [string, string][] = [
  ["phase_1_release", "Fase 1 · Liberação"],
  ["phase_2_activation", "Fase 2 · Ativação"],
  ["phase_3_integration", "Fase 3 · Integração"],
];

const LINE_STATUS: Record<string, string> = {
  tight: "tensa / encurtada",
  weak: "enfraquecida",
  normal: "normal",
};

const DROP_LEVEL: Record<string, string> = {
  none: "sem desnível",
  low: "desnível leve",
  mid: "desnível moderado",
  high: "desnível acentuado",
};

export function isPosturaResult(result: any): boolean {
  return !!result && typeof result.macro_diagnosis === "string";
}

function segmentMetrics(key: string, seg: any): string[] {
  const out: string[] = [];
  if (typeof seg?.vector_angle === "number") out.push(`ângulo ${seg.vector_angle}°`);
  if (typeof seg?.deviation_score === "number") out.push(`desvio ${seg.deviation_score}/100`);
  if (typeof seg?.tilt === "number") out.push(`inclinação ${seg.tilt}°`);
  if (typeof seg?.drop_level === "string")
    out.push(DROP_LEVEL[seg.drop_level] ?? seg.drop_level);
  if (typeof seg?.asymmetry_side === "string")
    out.push(`lado ${seg.asymmetry_side === "R" ? "direito" : seg.asymmetry_side === "L" ? "esquerdo" : seg.asymmetry_side}`);
  return out;
}

export function PosturaResult({ result, variant }: { result: any; variant: Variant }) {
  if (!isPosturaResult(result)) return null;
  const professor = variant === "professor";
  const segments = result.segments && typeof result.segments === "object" ? result.segments : {};
  const lines: any[] = professor && Array.isArray(result.myofascial_lines) ? result.myofascial_lines : [];
  const protocol = result.recovery_protocol && typeof result.recovery_protocol === "object" ? result.recovery_protocol : null;

  return (
    <div className="mt-3 space-y-4">
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
          {professor ? "Diagnóstico macro" : "Resumo da sua postura"}
        </h4>
        <p className="mt-1 text-sm">{result.macro_diagnosis}</p>
        {professor && typeof result.postural_archetype === "string" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Arquétipo: <b>{result.postural_archetype}</b>
          </p>
        )}
      </section>

      {Object.keys(SEGMENT_LABELS).some((k) => segments[k]?.finding) && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
            {professor ? "Segmentos" : "Pontos observados"}
          </h4>
          <ul className="mt-2 space-y-2">
            {Object.entries(SEGMENT_LABELS).map(([key, label]) => {
              const seg = segments[key];
              if (!seg?.finding) return null;
              const metrics = professor ? segmentMetrics(key, seg) : [];
              return (
                <li key={key} className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
                  <span className="font-medium">{label}</span>
                  {metrics.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">· {metrics.join(" · ")}</span>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{seg.finding}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {lines.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Linhas miofasciais</h4>
          <ul className="mt-2 space-y-2">
            {lines.map((line, i) => (
              <li key={`${line?.line_name ?? "linha"}-${i}`} className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
                <span className="font-medium">{line?.line_name ?? "Linha"}</span>
                {line?.status && (
                  <span className="ml-2 text-xs text-muted-foreground">· {LINE_STATUS[line.status] ?? line.status}</span>
                )}
                {line?.impact && <p className="mt-1 text-xs text-muted-foreground">{line.impact}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {protocol && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
            {professor ? "Protocolo de recuperação" : "Sugestões educativas"}
          </h4>
          <div className="mt-2 space-y-3">
            {PHASES.map(([key, title]) => {
              const items: unknown[] = Array.isArray(protocol[key]) ? protocol[key] : [];
              const texts = items.filter((x): x is string => typeof x === "string");
              if (!texts.length) return null;
              return (
                <div key={key}>
                  <p className="text-xs font-medium">{title}</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                    {texts.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        {professor
          ? "Leitura educativa gerada por IA. Revise antes de prescrever."
          : "Leitura educativa, não substitui avaliação profissional."}
      </p>
    </div>
  );
}
