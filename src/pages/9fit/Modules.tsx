import { ArrowLeft, CircleUserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { EcosystemGrid } from "@/components/9fit/EcosystemGrid";
import { StudentSectionHeader } from "@/components/9fit/StudentSectionHeader";

export default function NineFitModules() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-32">
      <StudentSectionHeader
        kicker="9FIT // ECOSSISTEMA"
        title="Seu universo 9FIT"
        description="Escolha uma experiência. Explore no seu ritmo."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/9fit/hub")}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              aria-label="Voltar ao Hub"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/9fit/profile")}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              aria-label="Abrir perfil"
            >
              <CircleUserRound className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 mt-5">
        <EcosystemGrid showHeader={false} showAll variant="hologram" />
      </main>

      <BottomNavigation />
    </div>
  );
}
