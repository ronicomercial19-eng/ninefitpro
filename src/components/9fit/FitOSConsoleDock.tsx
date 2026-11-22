import { useState } from "react";
import {
  Users,
  ShoppingBag,
  Target,
  CalendarCheck,
  Compass,
  Crown,
  Calendar,
} from "lucide-react";
import { STAFF_FLOW_ROUTE } from "@/lib/moduleRoute";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StudentActionCard } from "./StudentExperience";
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
    <div className="space-y-5">
      <NutritionCompactCard />
      <StudentActionCard
        icon={Calendar}
        title={plan}
        description={
          weekly
            ? `${weekly.treinos} sessões e ${weekly.minutos} minutos registrados nesta semana. ${library}.`
            : scoreStatus === "loading"
            ? "Lendo o resumo da semana."
            : `Resumo semanal não confirmado. ${library}.`
        }
        to="/9fit/planejamento"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <StudentActionCard
          icon={Users}
          title="Staff · profissionais"
          description="Abra a interface oficial para consultar atendimentos."
          to={STAFF_FLOW_ROUTE}
        />
        <StudentActionCard
          icon={Target}
          title="Metas e evolução"
          description="Acompanhe suas medidas e compare períodos."
          to="/9fit/progresso"
        />
        <StudentActionCard
          icon={CalendarCheck}
          title="Compromissos"
          description="Consulte sua agenda e as condições de cada reserva."
          to="/9fit/aulas-creditos?tab=schedule"
        />
        <StudentActionCard
          icon={Compass}
          title="Cobertura dos registros"
          description="Veja o radar semanal e consulte seus protocolos."
          onClick={() => setRadarOpen(true)}
        />
        <StudentActionCard
          icon={ShoppingBag}
          title="Loja 9FIT"
          description="Produtos e condições disponíveis no serviço parceiro."
          to="/9fit/native-system?app=store"
        />
        <StudentActionCard
          icon={Crown}
          title="Plano do app"
          description="Consulte acesso, prazo e condições da assinatura do 9FIT."
          to="/9fit/planos"
        />
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
