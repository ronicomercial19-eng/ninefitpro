import { useState } from "react";
import {
  Users,
  ShoppingBag,
  Target,
  CalendarCheck,
  Compass,
  Crown,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { STAFF_FLOW_ROUTE } from "@/lib/moduleRoute";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import "./hub-service-console.css";
import { NutritionCompactCard } from "./NutritionCompactCard";
import { DailyProtocol } from "./DailyProtocol";
import { WeeklyRadar3D } from "./WeeklyRadar3D";
import type { WeeklyCounts } from "./hubWeeklyBrief";
import type { CycleStatus } from "./cycleStatus";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";
interface Props {
  weekly: WeeklyCounts | null;
  scoreStatus: HubScoreStatus;
  liveScoresVitals?: unknown;
  invalidateUserState: () => void;
  performancePlanTitle: string | null;
  cycleStatus: CycleStatus;
  libraryStatus: "loading" | "ready" | "unavailable";
  breakdown: {
    treino: number | null;
    nutri: number | null;
    sono: number | null;
    mob: number | null;
    hidr: number | null;
  };
  protocolCount: number;
}
export function FitOSConsoleDock({
  weekly,
  scoreStatus,
  performancePlanTitle,
  cycleStatus,
  libraryStatus,
  breakdown,
  protocolCount,
}: Props) {
  const [radarOpen, setRadarOpen] = useState(false);
  const plan =
    cycleStatus === "active"
      ? performancePlanTitle || "Planejamento ativo"
      : cycleStatus === "none"
      ? "Seu planejamento"
      : cycleStatus === "loading"
      ? "Lendo planejamento"
      : "Planejamento a confirmar";
  const library =
    libraryStatus === "ready"
      ? `${protocolCount} conteúdos atribuídos ainda não concluídos`
      : libraryStatus === "loading"
      ? "Consultando seus conteúdos"
      : "Não foi possível confirmar seus conteúdos";
  return (
    <div className="hub-service-console">
      <div className="hub-service-featured">
        <NutritionCompactCard variant="console" />
        <Link className="hub-service-plan" to="/9fit/planejamento">
          <span className="hub-service-kicker">TREINO / PLANEJAMENTO</span>
          <ArrowUpRight
            className="hub-service-corner"
            size={17}
            aria-hidden="true"
          />
          <span className="hub-service-plan-art" aria-hidden="true">
            <span />
            <span />
            <span />
            <Calendar size={24} />
          </span>
          <strong>{plan}</strong>
          <span className="hub-service-stats">
            {weekly ? (
              <>
                <b>
                  {weekly.treinos}
                  <small>sessões</small>
                </b>
                <b>
                  {weekly.minutos}
                  <small>min nesta semana</small>
                </b>
              </>
            ) : (
              <span>
                {scoreStatus === "loading"
                  ? "Lendo a semana…"
                  : "Semana não confirmada"}
              </span>
            )}
          </span>
          <span className="hub-service-footnote">{library}</span>
        </Link>
      </div>
      <div className="hub-service-section-label">
        SEU SUPORTE <span /> ACOMPANHAMENTO
      </div>
      <nav
        className="hub-service-access"
        aria-label="Acompanhamento e serviços"
      >
        {[
          {
            icon: Users,
            title: "Staff · profissionais",
            detail: "Sua equipe",
            to: STAFF_FLOW_ROUTE,
            tone: "violet",
          },
          {
            icon: Target,
            title: "Metas e evolução",
            detail: "Seu progresso",
            to: "/9fit/progresso",
            tone: "blue",
          },
          {
            icon: CalendarCheck,
            title: "Compromissos",
            detail: "Sua agenda",
            to: "/9fit/aulas-creditos?tab=schedule",
            tone: "amber",
          },
          {
            icon: Compass,
            title: "Cobertura dos registros",
            detail: "Seu radar semanal",
            tone: "mint",
          },
        ].map(({ icon: Icon, title, detail, to, tone }) => {
          const content = (
            <>
              <span className="hub-service-glyph">
                <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="hub-service-access-copy">
                <small>{detail}</small>
                <strong>{title}</strong>
              </span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </>
          );
          return to ? (
            <Link
              className={`hub-service-entry hub-service-${tone}`}
              to={to}
              key={title}
            >
              {content}
            </Link>
          ) : (
            <button
              type="button"
              className={`hub-service-entry hub-service-${tone}`}
              onClick={() => setRadarOpen(true)}
              key={title}
            >
              {content}
            </button>
          );
        })}
      </nav>
      <div className="hub-service-utilities">
        <Link to="/9fit/native-system?app=store">
          <ShoppingBag size={16} aria-hidden="true" />
          Loja 9FIT
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
        <Link to="/9fit/planos">
          <Crown size={16} aria-hidden="true" />
          Plano do app
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </div>
      <Dialog open={radarOpen} onOpenChange={setRadarOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Cobertura dos registros</DialogTitle>
            <DialogDescription>
              O radar mostra os dados disponíveis da semana. Não é uma avaliação
              de saúde ou uma meta de treino.
            </DialogDescription>
          </DialogHeader>
          <DailyProtocol />
          <WeeklyRadar3D current={breakdown} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
