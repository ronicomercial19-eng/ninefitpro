import { Link, useLocation, useParams } from "react-router-dom";
import { ClipboardCheck, Loader2, ShieldAlert, UserSearch } from "lucide-react";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { isStaffRole } from "@/lib/authRole";
import { AssessmentDetailView, AssessmentWorkspace } from "@/components/progress/AssessmentWorkspace";

export const PROFESSOR_ASSESSMENT_BASE = "/app/avaliacoes";
type View = "resumo" | "capacidades" | "historico" | "meta" | "reavaliacao";
const VIEWS: View[] = ["capacidades", "historico", "meta", "reavaliacao"];
const SECTIONS = ["cardio", "composicao", "1rm"];

function State({ icon: Icon, title, children, role = "status" }: { icon: typeof Loader2; title: string; children?: React.ReactNode; role?: "status" | "alert" }) {
  return (
    <section role={role} className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
      <Icon className={`h-8 w-8 ${role === "alert" ? "text-destructive" : "text-primary"} ${Icon === Loader2 ? "animate-spin" : ""}`} />
      <h1 className="text-lg font-bold">{title}</h1>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </section>
  );
}

/**
 * Avaliação física do aluno selecionado no ProfessorWorkspace.
 * O aluno vem só da seleção resolvida no servidor (fn_coach_students_page); as RPCs
 * fn_get_assessment_hub / fn_get_avaliacao_detalhe aplicam a autorização de novo.
 */
export default function ProfessorAssessmentsPage() {
  const { id, section } = useParams();
  const { pathname } = useLocation();
  const { userRole, roleStatus } = useAuth();
  const w = useProfessorWorkspace();

  if (roleStatus === "ready" && !isStaffRole(userRole)) {
    return <State icon={ShieldAlert} title="Acesso restrito" role="alert">Esta área é exclusiva do painel profissional.</State>;
  }
  if (w.loading) return <State icon={Loader2} title="Confirmando vínculo do aluno…" />;
  if (w.error) {
    return (
      <State icon={ShieldAlert} title="Não foi possível confirmar o aluno" role="alert">
        Você pode não ter acesso a este aluno ou a conexão falhou.
        <div className="mt-3 flex justify-center gap-3">
          <button type="button" onClick={w.retry} className="min-h-11 rounded-lg border border-border px-4 text-foreground">Tentar novamente</button>
          <button type="button" onClick={() => w.select(null)} className="min-h-11 rounded-lg border border-border px-4 text-foreground">Limpar seleção</button>
        </div>
      </State>
    );
  }
  if (!w.athleteId || !w.selected) {
    return (
      <State icon={UserSearch} title="Selecione um aluno">
        Escolha um aluno no seletor acima para ver histórico, métricas e detalhes das avaliações físicas. Só aparecem alunos vinculados a você.
      </State>
    );
  }

  const athleteId = w.athleteId;
  const registerPath = w.link(`/app/alunos?tab=medidas`);
  const last = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const view: View = VIEWS.includes(last as View) ? (last as View) : "resumo";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Avaliação e análise
        </p>
        <Link to={registerPath} className="text-sm text-primary underline-offset-4 hover:underline">Abrir ficha do aluno</Link>
      </div>
      {id ? (
        <AssessmentDetailView
          athleteId={athleteId}
          assessmentId={id}
          section={section && SECTIONS.includes(section) ? section : "detalhe"}
          basePath={PROFESSOR_ASSESSMENT_BASE}
          assessmentPath={`${PROFESSOR_ASSESSMENT_BASE}/detalhe`}
        />
      ) : (
        <AssessmentWorkspace
          athleteId={athleteId}
          athleteName={w.selected.name}
          initialView={view}
          mode="professional"
          basePath={PROFESSOR_ASSESSMENT_BASE}
          assessmentPath={`${PROFESSOR_ASSESSMENT_BASE}/detalhe`}
          registerPath={registerPath}
        />
      )}
    </div>
  );
}
