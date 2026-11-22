import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  Dumbbell,
  Utensils,
  ChartNoAxesCombined,
  Moon,
  Users,
  Layers,
  ChevronRight,
} from "lucide-react";
import { HubCommandDeck } from "./HubCommandDeck";
import { NutritionTodaySummary } from "./NutritionTodaySummary";
import { BehavioralHistory } from "./BehavioralHistory";
import { DailyGoalCheckins } from "./DailyGoalCheckins";
import { QuickCheckIn } from "./QuickCheckIn";
import { EmojiCalibrationQuiz } from "./EmojiCalibrationQuiz";
import { EcoEmbed } from "./EcoEmbed";
import { COMMUNITY_URL } from "@/lib/communityUrl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StudentSectionHeader } from "./StudentSectionHeader";
import {
  StudentActionCard,
  StudentBlockTitle,
  StudentDetailGroup,
} from "./StudentExperience";
import { weekRead, type WeeklyCounts } from "./hubWeeklyBrief";
import type { CycleStatus } from "./cycleStatus";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";
import communityImage from "@/assets/images/community_athletes_tribe_1790011163765.jpg";

interface OSDashboardProps {
  name: string;
  syncScore: number | null;
  scoreStatus: HubScoreStatus;
  weekly: WeeklyCounts | null;
  cycleStatus: CycleStatus;
}
export function OSDashboard({
  name,
  syncScore,
  scoreStatus,
  weekly,
  cycleStatus,
}: OSDashboardProps) {
  const [panel, setPanel] = useState<
    "nutrition" | "history" | "recovery" | null
  >(null);
  const [community, setCommunity] = useState(false);
  const planLabel =
    cycleStatus === "active"
      ? "Prescrição disponível"
      : cycleStatus === "none"
      ? "Confira as opções disponíveis"
      : "Prescrição a confirmar";
  return (
    <div className="mx-auto max-w-5xl space-y-7 px-4 pb-8 sm:px-6 sm:pt-3">
      <StudentSectionHeader
        kicker="9FIT / INÍCIO"
        title={`Bom ter você aqui, ${name}.`}
        description="Seu contexto de hoje. Uma orientação para começar."
        actions={
          <Link
            to="/9fit/profile"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Meu perfil
          </Link>
        }
      />
      <HubCommandDeck
        name={name}
        syncScore={syncScore}
        scoreStatus={scoreStatus}
        weekly={weekly ?? { treinos: 0, nutri: 0, minutos: 0 }}
        weeklyKnown={weekRead(weekly != null, scoreStatus) === "ready"}
        hasPlan={cycleStatus === "active"}
      />
      <section aria-label="Seu caminho no app">
        <StudentBlockTitle
          number="02"
          title="Seu caminho no app"
          description="Vá direto ao que você precisa, sem passar por uma nova escolha."
        />
        <div id="home-shortcuts" className="grid gap-3 sm:grid-cols-2">
          <StudentActionCard
            icon={Dumbbell}
            title="Meu treino"
            description="Confira a sessão, os ajustes e o ponto de onde parou."
            to="/9fit/train"
            badge={planLabel}
          />
          <StudentActionCard
            icon={ChartNoAxesCombined}
            title="Minha evolução"
            description="Compare seus registros e acompanhe mudanças ao longo do tempo."
            to="/9fit/progresso"
          />
          <StudentActionCard
            icon={Utensils}
            title="Alimentação e água"
            description="Consulte sua dieta e registre o que consumiu hoje."
            onClick={() => setPanel("nutrition")}
          />
          <StudentActionCard
            icon={Brain}
            title="Conversar com RON"
            description="Leve uma dúvida e seu contexto para a conversa com o assistente."
            to="/9fit/ron?context=hub_command"
          />
        </div>
      </section>
      <StudentDetailGroup
        title="Olhar mais de perto"
        description="Histórico, recuperação e serviços. Abra quando precisar."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <StudentActionCard
            icon={ChartNoAxesCombined}
            title="Histórico da rotina"
            description="Veja os dias com registros de treino e alimentação."
            onClick={() => setPanel("history")}
          />
          <StudentActionCard
            icon={Moon}
            title="Sono, energia e recuperação"
            description="Revise como você está e atualize seu check-in."
            onClick={() => setPanel("recovery")}
          />
          <StudentActionCard
            icon={Layers}
            title="Serviços e módulos"
            description="Encontre Staff, conteúdos e os outros serviços do ecossistema."
            to="/9fit/modules"
          />
          <StudentActionCard
            icon={ChartNoAxesCombined}
            title="Registrar no Hub"
            description="Adicione registros e acompanhe as curvas da sua semana."
            to="/9fit/hub"
          />
        </div>
      </StudentDetailGroup>
      <section
        className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-[#111416]"
        aria-label="Comunidade 9FIT"
      >
        <img
          src={communityImage}
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/75 to-transparent" />
        <div className="flex flex-wrap items-end justify-between gap-5 p-6 sm:p-8">
          <div className="max-w-md">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Users size={15} aria-hidden="true" />
              Juntos, no seu ritmo
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">
              Sua rotina também pode ter companhia.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Troque experiências e compartilhe suas conquistas na comunidade.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCommunity(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-black/40 px-4 text-sm text-white hover:border-primary"
          >
            Conhecer a comunidade
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {panel === "nutrition"
                ? "Alimentação e água"
                : panel === "history"
                ? "Seu histórico de rotina"
                : "Como você está hoje?"}
            </DialogTitle>
            <DialogDescription>
              {panel === "nutrition"
                ? "Seu plano e seus registros, com ações para atualizar o dia."
                : panel === "history"
                ? "Consulte os registros confirmados. Dias sem registro não significam que você não fez a atividade."
                : "Seus relatos ajudam a revisar a sessão. O check-in não é uma avaliação médica."}
            </DialogDescription>
          </DialogHeader>
          {panel === "nutrition" && <NutritionTodaySummary interactive />}
          {panel === "history" && (
            <>
              <BehavioralHistory />
              <DailyGoalCheckins />
            </>
          )}
          {panel === "recovery" && (
            <>
              <QuickCheckIn />
              <EmojiCalibrationQuiz onComplete={() => setPanel(null)} />
            </>
          )}
        </DialogContent>
      </Dialog>
      {community && (
        <EcoEmbed
          title="COMUNIDADE 9FIT"
          url={COMMUNITY_URL}
          backTo="/9fit/os"
        />
      )}
    </div>
  );
}
