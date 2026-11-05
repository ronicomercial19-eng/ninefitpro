import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";

export function TrainingLoadHistory() {
  const { athleteId } = useProfessorWorkspace();
  if (!athleteId) return <p>Selecione um aluno para consultar as cargas registradas.</p>;
  return <LoadHistory key={athleteId} athleteId={athleteId} />;
}

function LoadHistory({ athleteId }: { athleteId: string }) {
  const { user } = useAuth();
  const gradient = useId();
  const [exercise, setExercise] = useState("");
  const history = useQuery({
    queryKey: ["professor-load-history", user?.id, athleteId],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from("workout_exercise_sets")
        .select("exercise_name,actual_weight,workout_executions!inner(athlete_id,workout_date)")
        .eq("workout_executions.athlete_id", athleteId)
        .eq("completed", true).gt("actual_weight", 0)
        .order("created_at", { ascending: false }).limit(1000).abortSignal(signal);
      if (error) throw error;
      return (data ?? []).flatMap((row) => {
        const date = row.workout_executions?.workout_date;
        const kg = Number(row.actual_weight);
        return date && row.exercise_name && Number.isFinite(kg) && kg > 0
          ? [{ date, kg, exercise: row.exercise_name }] : [];
      });
    },
  });

  const rows = history.data ?? [];
  const exercises = [...new Set(rows.map((row) => row.exercise))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const selected = exercises.includes(exercise) ? exercise : exercises[0];
  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (row.exercise === selected) byDate.set(row.date, Math.max(row.kg, byDate.get(row.date) ?? 0));
  }
  const points = [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, kg]) => ({ date, kg }));
  const displayDate = (date: string) => date.slice(0, 10).split("-").reverse().join("/");

  return (
    <section className="space-y-4 rounded-md border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="nine-core-kicker">Execuções registradas</p>
          <h2 className="text-xl font-semibold">Histórico de cargas</h2>
        </div>
        {!!exercises.length && <label className="flex flex-wrap items-center gap-2 text-sm">
          Exercício
          <select className="max-w-full rounded border bg-background p-2" value={selected} onChange={(event) => setExercise(event.target.value)}>
            {exercises.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>}
      </div>
      {history.isPending ? <p role="status">Carregando cargas…</p>
        : history.isError ? <div role="alert">Não foi possível carregar o histórico.{" "}
          <Button variant="outline" onClick={() => void history.refetch()}>Tentar novamente</Button>
        </div>
        : !points.length ? <p className="text-muted-foreground">Este aluno ainda não tem séries concluídas com carga registrada.</p>
        : <>
          <p className="text-sm text-muted-foreground">Maior carga por data, em kg. Até 1.000 séries concluídas mais recentes.</p>
          <div className="h-64 min-w-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points}>
                <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff5a1f" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#ff5a1f" stopOpacity={0} />
                </linearGradient></defs>
                <XAxis dataKey="date" tickFormatter={displayDate} minTickGap={26} />
                <YAxis width={50} unit=" kg" />
                <Tooltip labelFormatter={(date) => displayDate(String(date))} formatter={(kg) => [kg + " kg", "Carga"]} />
                <Area dataKey="kg" stroke="#ff5a1f" strokeWidth={3} fill={`url(#${gradient})`} dot={points.length === 1} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer">Ver valores por data</summary>
            <dl className="mt-2 max-h-64 overflow-auto">{points.map(({ date, kg }) => (
              <div key={date} className="flex justify-between gap-3 border-b py-2"><dt>{displayDate(date)}</dt><dd>{kg.toLocaleString("pt-BR")} kg</dd></div>
            ))}</dl>
          </details>
        </>}
    </section>
  );
}
