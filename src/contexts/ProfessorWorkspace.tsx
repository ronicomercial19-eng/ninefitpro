import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withTimeout } from "@/lib/withTimeout";
import {
  ATHLETE_PARAM,
  isAthleteId,
  withAthlete,
} from "@/lib/professorWorkspace";
export interface CoachStudent {
  id: string;
  name: string;
  user_id: string | null;
  goal: string | null;
  active: boolean;
}
interface Workspace {
  students: CoachStudent[];
  selected: CoachStudent | null;
  athleteId: string | null;
  loading: boolean;
  error: boolean;
  select: (id: string | null) => void;
  retry: () => void;
  link: (path: string) => string;
}
const Context = createContext<Workspace | null>(null);
const EMPTY_STUDENTS: CoachStudent[] = [];
export function ProfessorWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth(),
    location = useLocation(),
    navigate = useNavigate();
  const key = `9fit:professor:student:${user?.id || "none"}`;
  const [remembered, setRemembered] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      setRemembered(sessionStorage.getItem(key));
    } catch {
      setRemembered(null);
    }
  }, [key]);
  const query = useQuery({
    queryKey: ["professor-students", user?.id],
    enabled: !!user,
    staleTime: 300_000,
    queryFn: async ({ signal }) => {
      const { data, error } = await withTimeout(supabase.rpc("fn_coach_students" as any).abortSignal(signal));
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("Lista de alunos inválida");
      return data as unknown as CoachStudent[];
    },
  });
  const params = new URLSearchParams(location.search),
    explicit = params.get(ATHLETE_PARAM);
  const candidate = explicit === null ? remembered : explicit;
  const selected = query.isError
    ? null
    : (query.data?.find((s) => s.id === candidate) ?? null);
  const athleteId = selected?.id ?? null;
  const select = (id: string | null) => {
    if (id && (!isAthleteId(id) || !query.data?.some((s) => s.id === id)))
      return;
    setRemembered(id);
    try {
      if (id) sessionStorage.setItem(key, id);
      else sessionStorage.removeItem(key);
    } catch {
      /* Optional navigation memory. */
    }
    const next = new URLSearchParams(location.search);
    if (id) next.set(ATHLETE_PARAM, id);
    else next.set(ATHLETE_PARAM, "");
    navigate({ pathname: location.pathname, search: next.toString() });
  };
  useEffect(() => {
    if (selected) {
      setRemembered(selected.id);
      try {
        sessionStorage.setItem(key, selected.id);
      } catch {}
    }
  }, [selected?.id, key]);
  return (
    <Context.Provider
      value={{
        students: query.data ?? EMPTY_STUDENTS,
        selected,
        athleteId,
        loading: query.isLoading,
        error: query.isError || !!(explicit && !query.isLoading && !selected),
        select,
        retry: () => {
          void query.refetch();
        },
        link: (path) => withAthlete(path, athleteId),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useProfessorWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("ProfessorWorkspaceProvider ausente");
  return context;
}
export function ProfessorStudentBar() {
  const w = useProfessorWorkspace();
  const [search, setSearch] = useState("");
  const matches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return term ? w.students.filter(student => student.name.toLocaleLowerCase('pt-BR').includes(term)) : w.students;
  }, [search, w.students]);
  const options = matches.slice(0, 100);
  if (w.selected && !options.some(student => student.id === w.selected?.id)) options.unshift(w.selected);
  return (
    <section
      className="mb-5 rounded-xl border border-primary/25 bg-card p-3"
      aria-label="Contexto do aluno"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="professor-student" className="text-sm font-medium">
          Aluno em acompanhamento
        </label>
        <input
          aria-label="Buscar aluno em acompanhamento"
          placeholder="Buscar aluno pelo nome"
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="max-w-full rounded-lg border border-border bg-background p-2 text-sm"
        />
        <select
          id="professor-student"
          className="max-w-full rounded-lg border border-border bg-background p-2 text-sm"
          value={w.athleteId ?? ""}
          disabled={w.loading || w.error}
          onChange={(e) => w.select(e.target.value || null)}
        >
          <option value="">Visão geral · selecionar aluno</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {!s.active ? " · inativo" : ""}
            </option>
          ))}
        </select>
        {matches.length > 100 && <span className="text-xs text-muted-foreground">Mostrando 100 de {matches.length}. Digite o nome para encontrar outro aluno.</span>}
        {search && matches.length === 0 && <span role="status" className="text-xs text-muted-foreground">Nenhum aluno com esse nome.</span>}
        {w.selected && (
          <span className="text-xs text-muted-foreground">
            As ferramentas usam o contexto de {w.selected.name}.
          </span>
        )}
        {w.loading && <span className="text-xs">Carregando vínculo…</span>}
        {w.error && (
          <div role="alert" className="text-sm text-destructive">
            Não foi possível confirmar o aluno.{" "}
            <button onClick={w.retry} className="underline">
              Tentar novamente
            </button>{" "}
            <button onClick={() => w.select(null)} className="underline">
              Limpar seleção
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function ProfessorScope({ children }: { children: React.ReactNode }) {
  const w = useProfessorWorkspace();
  return <div key={w.athleteId ?? "all"}>{children}</div>;
}
