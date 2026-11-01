import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { Button } from "@/components/ui/button";

export function ProfessorSkills() {
  const workspace = useProfessorWorkspace();
  const query = useQuery({
    queryKey: ["professor-active-skills"],
    queryFn: async () => {
      const { data, error } = await supabase.from("skills")
        .select("id,name,description,category,version").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });
  return <section className="space-y-4">
    <h1 className="text-2xl font-semibold">Skills</h1>
    <p className="text-sm text-muted-foreground">Consulte as skills ativas do ecossistema. A prescrição e a análise são feitas no contexto do aluno selecionado.</p>
    <div className="flex flex-wrap gap-2">
      <Button asChild><Link to={workspace.link("/app/treino-ia")}>Preparar treino</Link></Button>
      <Button asChild variant="outline"><Link to={workspace.link("/app/analise-ia")}>Analisar aluno</Link></Button>
      <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Atualizar skills</Button>
    </div>
    {query.isError ? <p role="alert">Não foi possível carregar as skills. Tente atualizar.</p>
      : query.isLoading ? <p>Carregando…</p>
      : query.data?.length ? <div className="grid gap-3 md:grid-cols-2">{query.data.map(skill => <article key={skill.id} className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">{skill.name}</h2><p className="text-xs text-muted-foreground">{skill.category} · v{skill.version}</p><p className="mt-2 text-sm">{skill.description}</p>
      </article>)}</div> : <p>Nenhuma skill ativa publicada.</p>}
  </section>;
}
