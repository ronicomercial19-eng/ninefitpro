import { CapacityResetEditor } from './CapacityResetEditor';
import { ReadinessCard } from '@/components/9fit/ReadinessCard';
import { lazy, Suspense, useState } from "react";
import { ProfessorPrescription } from "./ProfessorPrescription";
import { ProfessionalMessages } from "./ProfessionalMessages";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCoachStudentContext } from "@/hooks/useCoachStudentContext";
import { consecutiveDays } from "@/lib/studentDates";
import { Button } from "@/components/ui/button";
import { completionLabel, completionReason } from '@/lib/workoutCompletion';
import { goalLabel } from '@/lib/athleteGoal';
const AgendaPage = lazy(() => import("@/pages/AgendaPage"));
const RonProfessorPage = lazy(() => import("@/pages/admin/RonProfessorPage"));
const labels: Record<string, string> = {
  goal: "Objetivo",
  primary_goal: "Objetivo",
  injury_zones: "Restrições declaradas",
  peak_window: "Horário preferido",
  weekly_frequency: "Frequência semanal",
  experience_level: "Experiência",
  session_minutes: "Duração da sessão",
  training_environment: "Ambiente",
  assistance: "Assistência",
  reduced_motion: "Reduzir movimento",
  time_horizon: "Horizonte (semanas)",
  recovery_rate: "Velocidade de recuperação",
  volume_tolerance: "Tolerância a volume",
  stress_sensitivity: "Sensibilidade ao estresse",
  discomfort_tolerance: "Tolerância a desconforto",
};
const statuses: Record<string, string> = {
  completed: "concluído",
  in_progress: "em andamento",
  skipped: "não realizado",
  scheduled: "agendado",
  cancelled: "cancelado",
  no_show: "ausência",
  pending: "pendente",
  abandoned: "interrompido",
  routed: "encaminhado",
  blocked: "revisão necessária",
  resolved: "resolvido",
};
const valueLabels: Record<string, string> = { night: "Noite", gym: "Academia", fast: "Rápida", guided: "Guiada", moderate: "Moderado" };
const text = (value: unknown) =>
  value == null
    ? "Não informado"
    : Array.isArray(value)
      ? value.length
        ? value.join(", ")
        : "Nenhum declarado"
      : typeof value === "boolean"
        ? value
          ? "Sim"
          : "Não"
        : typeof value === "object"
          ? JSON.stringify(value)
          : valueLabels[String(value)] ?? String(value);
export function CoachStudentPanel({ athleteId }: { athleteId: string }) {
  const q = useCoachStudentContext(athleteId);
  const [panel, setPanel] = useState<string | null>(null);
  if (q.isLoading) return <p>Carregando contexto compartilhado…</p>;
  if (q.isError || !q.data)
    return (
      <div role="alert" className="rounded-xl border p-5">
        Não foi possível confirmar o contexto do aluno.{" "}
        <Button variant="outline" onClick={() => void q.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  const c = q.data,
    d = c.daily_context;
  const groups = [
    [
      "Treinos executados · 30 dias",
      c.workouts.map(
        (r) =>
          `${r.workout_date} · ${r.status === 'completed' ? completionLabel(r) : statuses[r.status] || r.status} · esforço ${r.avg_rpe >= 1 && r.avg_rpe <= 10 ? r.avg_rpe : "não informado"} · ${r.duration_minutes ?? "—"} min${r.status === 'completed' && completionReason(r) ? ` · ${completionReason(r)}` : ''}`,
      ),
    ],
    [
      "Prescrições atribuídas",
      c.prescriptions.map(
        (r) =>
          `${r.training_name} · ${r.is_active ? "ativa" : "inativa"} · ${r.start_date ?? "—"} até ${r.end_date ?? "sem vencimento"}`,
      ),
    ],
    [
      "Dor e restrições registradas",
      c.pain_reports.map(
        (r) =>
          `${new Date(r.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · ${r.body_region} · intensidade ${r.intensity} · ${statuses[r.status] || r.status || "sem resolução registrada"}`,
      ),
    ],
    [
      "Avaliações",
      c.assessments.map(
        (r) =>
          `${r.data_avaliacao} · peso ${r.peso ?? "—"} kg · gordura ${r.gordura_corporal ?? "—"}% · massa muscular ${r.massa_muscular ?? "—"} kg`,
      ),
    ],
    [
      "Atividades Move · registros reais",
      c.activities.map(
        (r) =>
          `${new Date(r.recorded_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · ${(Number(r.distance_m) / 1000).toFixed(2)} km · ${r.duration_seconds ?? "duração não registrada"} s`,
      ),
    ],
    [
      "Hábitos do aluno · acompanhamento",
      c.habits.map(
        (r) =>
          `${r.title} · hoje ${r.dates?.includes(d.date) ? "registrado" : "sem conclusão"} · sequência ${consecutiveDays(r.dates ?? [], d.date)} dias`,
      ),
    ],
    [
      "Protocolos concluídos",
      c.protocols.map((r) => `${r.completion_date} · ${r.name}`),
    ],
    [
      "Agenda · últimos e próximos compromissos",
      c.appointments.map(
        (r) =>
          `${new Date(r.scheduled_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · ${r.title} · ${statuses[r.status] || r.status}`,
      ),
    ],
  ] as Array<[string, string[]]>;
  return (
    <section className="space-y-5">
      <ReadinessCard athleteId={athleteId} coach/>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Acompanhamento · {c.athlete.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Contexto de {d.date} · atualizado{" "}
            {new Date(c.generated_at).toLocaleTimeString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
            . Registros ausentes não são medições zero.
          </p>
        </div>
        <Button variant="outline" onClick={() => void q.refetch()}>
          Atualizar registros
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {["Ajustar treino de hoje", "Perguntar ao RON", "Agendar", "Chamar aluno", "Confirmar ficha"].map(title =>
          <Button key={title} className="min-h-11" variant="outline" onClick={() => setPanel(title)}>{title}</Button>)}
        {c.prescriptions.some(plan => plan.is_active && (!plan.start_date || plan.start_date <= d.date) && (!plan.end_date || plan.end_date >= d.date)) &&
          <span className="rounded-full border px-3 py-1 text-xs">Plano ativo</span>}
      </div>
      <Dialog open={!!panel} onOpenChange={open => { if (!open) setPanel(null); }}>
        <DialogContent className="max-h-[85dvh] max-w-4xl overflow-y-auto">
          <DialogTitle>{panel} · {c.athlete.name}</DialogTitle>
          <Suspense fallback={<p>Carregando…</p>}>
            {panel === "Ajustar treino de hoje" ? <ProfessorPrescription embedded initialDate={d.date} />
              : panel === "Perguntar ao RON" ? <RonProfessorPage />
              : panel === "Agendar" ? <AgendaPage />
              : panel === "Chamar aluno" ? <ProfessionalMessages athleteId={athleteId} name={c.athlete.name} professional />
              : panel === "Confirmar ficha" && <CapacityResetEditor athleteId={athleteId} />}
          </Suspense>
        </DialogContent>
      </Dialog>
      {d.safety.review_required && (
        <div
          role="status"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
        >
          Há dor ou restrição registrada. Revise a sessão com o aluno antes de
          orientar a execução. O SYNC não é liberação médica.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-3">
        {[
          ["SYNC percebido · hoje", d.sync.value ?? "Não coletado"],
          [
            "Calibração · hoje",
            d.calibration.complete ? "Completa" : Object.values(d.calibration).some(value => typeof value === "number") ? "Incompleta" : "Não coletado",
          ],
          ["Água registrada · hoje", d.today.water_ml > 0 ? `${d.today.water_ml} ml` : "Sem registro"],
          ["Refeições registradas · hoje", d.today.meals > 0 ? d.today.meals : "Sem registro"],
        ].map(([label, value]) => (
          <div key={String(label)} className="min-w-0 rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Ficha declarada e preferências</h2>
          <p className="mt-2 text-sm">
            Objetivo atual: {goalLabel(c.athlete.goal)}
          </p>
          <p className="text-xs text-muted-foreground">
            {c.athlete.goal_source === 'student_declared'
              ? 'Origem: ficha declarada pelo aluno. Tem prioridade sobre o cadastro anterior.'
              : 'Origem: cadastro do aluno. Nenhum objetivo declarado na ficha está disponível.'}
          </p>
          {c.athlete.goal_source === 'student_declared' && c.athlete.registered_goal && c.athlete.registered_goal !== c.athlete.goal && (
            <p className="text-xs text-muted-foreground">Objetivo no cadastro anterior: {goalLabel(c.athlete.registered_goal)}. Confirme com o aluno ao revisar o plano.</p>
          )}
          <p className="text-sm">
            Restrição cadastrada: {c.athlete.restrictions || "Não informada"}
          </p>
          {Object.entries({
            ...d.profile.declared,
            ...d.profile.preferences,
          }).filter(([key]) => key !== 'goal' && key !== 'primary_goal').map(([key, value]) => (
            <p key={key} className="mt-1 text-sm">
              <b>{labels[key] || key.replace(/_/g, " ")}:</b> {text(value)}
            </p>
          ))}
          <p className="mt-3 text-xs text-muted-foreground">
            Respostas pessoais são preservadas. Orientações profissionais são
            registradas na prescrição.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Percepção de hoje</h2>
          {Object.entries({
            Sono: d.calibration.sleep,
            Energia: d.calibration.energy,
            Humor: d.calibration.mood,
            Motivação: d.calibration.motivation,
            Dor: d.calibration.pain,
          }).map(([key, value]) => (
            <p className="mt-1 text-sm" key={key}>
              {key}: {value ?? "Não coletado"}{" "}
              {value != null ? "(escala 1–5)" : ""}
            </p>
          ))}
          <p className="mt-3 text-xs text-muted-foreground">
            Diário em 30 dias: {c.nutrition.meals} refeições em{" "}
            {c.nutrition.days} dias; hidratação registrada em {c.hydration.days}{" "}
            dias. Isto mede registros, não adequação nutricional.
          </p>
        </article>
      </div>
      {groups.some(([, rows]) => rows.length === 0) && <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Sem dados ainda em {groups.filter(([, rows]) => rows.length === 0).length} seções deste recorte.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.filter(([, rows]) => rows.length > 0).map(([title, rows]) => (
          <article key={title} className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold">{title}</h2>
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
                {rows.map((row, i) => (
                  <li key={i} className="border-b pb-2 text-sm">
                    {row}
                  </li>
                ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
