import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { businessDate } from "@/services/dailyContextRules";
import { previousDate } from "@/lib/studentDates";
import {
  summarizeOverview,
  type CoachOverviewRow,
} from "@/lib/professorOverview";
import { exportToCSV } from "@/utils/exportUtils";
import { Button } from "@/components/ui/button";
export function CoachOverview({
  title = "Dashboard",
  report = false,
}: {
  title?: string;
  report?: boolean;
}) {
  const { user } = useAuth(),
    w = useProfessorWorkspace();
  const [period, setPeriod] = useState(30);
  const end = businessDate();
  let start = end;
  for (let i = 1; i < period; i++) start = previousDate(start);
  const q = useQuery({
    queryKey: ["coach-overview", user?.id, start, end],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_coach_overview" as any, {
        p_start: start,
        p_end: end,
      });
      if (error) throw error;
      return data as unknown as {
        start: string;
        end: string;
        generated_at: string;
        students: CoachOverviewRow[];
      };
    },
  });
  if (q.isLoading) return <p>Carregando indicadores confirmados…</p>;
  if (q.isError || !q.data)
    return (
      <div role="alert">
        Não foi possível carregar os indicadores. Nenhum zero foi calculado a
        partir de falha.{" "}
        <Button variant="outline" onClick={() => void q.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  const rows = w.athleteId
      ? q.data.students.filter((r) => r.id === w.athleteId)
      : q.data.students,
    summary = summarizeOverview(rows, end);
  function download() {
    exportToCSV(
      rows.map((r) => ({
        Aluno: r.name,
        Objetivo: r.goal ?? "Não informado",
        Ativo: r.active ? "Sim" : "Não",
        Inicio: start,
        Fim: end,
        Treinos_concluidos: r.completed_workouts,
        Sessoes_prescritas: r.prescribed_sessions,
        RPE_medio: r.avg_rpe ?? "Não informado",
        Minutos_registrados: r.duration_minutes,
      })),
      `acompanhamento-${start}-${end}`,
    );
  }
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {w.selected ? w.selected.name : "Alunos autorizados"} · {start} a{" "}
            {end} · calendário de São Paulo.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            aria-label="Período dos indicadores"
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="rounded-lg border bg-background p-2"
          >
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
          <Button variant="outline" onClick={() => void q.refetch()}>
            Atualizar
          </Button>
          {report && (
            <Button disabled={!rows.length} onClick={download}>
              Exportar CSV
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Alunos únicos", summary.students],
          ["Alunos ativos", summary.active],
          ["Execuções concluídas", summary.completed],
          ["Sessões prescritas no período", summary.prescribed],
          ["Sem atribuição de treino", summary.withoutTraining],
          ["Atribuição sem vencimento", summary.withoutEndDate],
          ["Atribuição vencida", summary.expired],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Execuções vêm dos registros concluídos no Train; prescrição não comprova
        execução. Atribuições são classificadas por pessoa, com vigência na data
        atual. RPE é esforço percebido e não SYNC ou avaliação clínica.
      </p>
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {[
                "Aluno",
                "Concluídos",
                "Prescritos",
                "RPE médio",
                "Minutos",
              ].map((h) => (
                <th key={h} className="p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-3">
                  <Link
                    to={`/app/acompanhamento?athlete=${r.id}`}
                    className="text-primary underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="p-3">{r.completed_workouts}</td>
                <td className="p-3">{r.prescribed_sessions}</td>
                <td className="p-3">{r.avg_rpe ?? "Não informado"}</td>
                <td className="p-3">{r.duration_minutes}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="p-5">
                  Nenhum aluno neste escopo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {[
          ["Acompanhamento", "/app/acompanhamento"],
          ["Revisar treino", "/app/treino-ia"],
          ["Agenda", "/app/agenda"],
          ["Conversas", "/app/mensagens"],
        ].map(([label, path]) => (
          <Link
            key={path}
            to={w.link(path)}
            className="rounded-lg border px-3 py-2"
          >
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
