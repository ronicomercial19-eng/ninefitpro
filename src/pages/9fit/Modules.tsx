import { ArrowLeft, CircleUserRound, Grid2X2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { EcosystemGrid } from "@/components/9fit/EcosystemGrid";

export default function NineFitModules() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top Brand & Action Bar */}
      <header className="px-4 pt-6 sm:px-6">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08] bg-[#14151b] text-neutral-300 hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <p className="font-display text-lg sm:text-xl font-black tracking-tight text-white">
            <span className="text-[#FF6600]">9</span>FIT PRO
          </p>

          <button
            type="button"
            onClick={() => navigate("/9fit/profile")}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08] bg-[#14151b] text-neutral-300 hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
            aria-label="Abrir perfil"
          >
            <CircleUserRound className="h-5 w-5" />
          </button>
        </div>

        {/* Section Header */}
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#FF6600] font-bold">
              TODOS OS MÓDULOS · EXPERIMENTE AQUI
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
              Ecosystem
            </h1>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/[0.08] bg-[#14151b] text-[#FF6600]">
            <Grid2X2 className="h-4 w-4" />
          </div>
        </div>
      </header>

      {/* Modules List matching IMG_0114.png */}
      <main className="px-4 sm:px-6 mt-5">
        <EcosystemGrid showHeader={false} showAll variant="dense" />
      </main>

      <BottomNavigation />
    </div>
  );
}
