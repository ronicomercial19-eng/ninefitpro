import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

export interface HubMissions {
  missao_perfil?: boolean;
  missao_avaliacao: boolean;
  missao_plano: boolean;
  missao_primeiro_treino: boolean;
  missao_3dias: boolean;
  missao_7dias: boolean;
}

const ROWS: Array<{
  key: keyof HubMissions;
  label: string;
  cta: string;
  route: string;
}> = [
  { key: "missao_perfil",          label: "Completar perfil",            cta: "Completar",       route: "/9fit/profile?flow=complete" },
  { key: "missao_avaliacao",       label: "Avaliação inicial feita",     cta: "Fazer avaliação", route: "/9fit/avaliacao-guiada" },
  { key: "missao_plano",           label: "Primeiro plano gerado",       cta: "Gerar plano",     route: "/9fit/planejamento" },
  { key: "missao_primeiro_treino", label: "Primeiro treino registrado",  cta: "Registrar agora", route: "/9fit/train" },
  { key: "missao_3dias",           label: "3+ dias no Hub",              cta: "Abrir Hub",       route: "/9fit/hub" },
  { key: "missao_7dias",           label: "7 dias de consistência",      cta: "Ver progresso",   route: "/9fit/progresso" },
];

export function HubMissionsCard({ missions }: { missions: HubMissions | null }) {
  const navigate = useNavigate();
  const m: HubMissions = missions ?? {
    missao_perfil: false, missao_avaliacao: false, missao_plano: false,
    missao_primeiro_treino: false, missao_3dias: false, missao_7dias: false,
  };
  const done = ROWS.filter(r => !!m[r.key]).length;
  const pct = Math.round((done / ROWS.length) * 100);

  return (
    <div className="surface-card p-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-label">SUA ATIVAÇÃO</p>
        <p className="text-[11px] font-data text-primary tabular-nums">{done}/{ROWS.length} · {pct}%</p>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-3">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2">
        {ROWS.map((r) => {
          const done = !!m[r.key];
          return (
            <li key={r.key} className="flex items-center gap-3">
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className={`flex-1 text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
                {r.label}
              </span>
              {!done && (
                <button
                  onClick={() => navigate(r.route)}
                  className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 hover:underline"
                >
                  {r.cta} <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
