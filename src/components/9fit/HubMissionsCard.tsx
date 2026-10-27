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
  const rows = ROWS.filter((r) => m[r.key] !== undefined);
  const done = rows.filter(r => !!m[r.key]).length;
  if (!rows.length || done === rows.length) return null;
  const pct = Math.round((done / rows.length) * 100);

  return (
    <div className="rounded-3xl border border-[#EF7A45]/25 bg-[#0B0B0C] p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] font-mono tracking-[0.12em] font-bold text-[#EF7A45] uppercase">Sua ativação</p>
        <p className="text-[11px] font-mono text-white/70 tabular-nums">{done}/{rows.length} · {pct}%</p>
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-3">
        <div className="h-full bg-[#EF7A45] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2">
        {rows.map((r) => {
          const complete = !!m[r.key];
          return (
            <li key={r.key} className="flex items-center gap-3">
              {complete ? (
                <CheckCircle2 className="w-5 h-5 text-[#EF7A45] shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-white/35 shrink-0" />
              )}
              <span className={`flex-1 text-sm ${complete ? "text-white" : "text-white/55"}`}>
                {r.label}
              </span>
              {!complete && (
                <button
                  onClick={() => navigate(r.route)}
                  className="text-[11px] font-semibold text-[#EF7A45] inline-flex items-center gap-1 hover:underline"
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
