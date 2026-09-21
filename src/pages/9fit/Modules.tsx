import { ArrowLeft, CircleUserRound, Grid2X2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { EcosystemGrid } from "@/components/9fit/EcosystemGrid";

export default function NineFitModules() {
  const navigate = useNavigate();
  return <div className="fit-os-grid min-h-screen bg-background pb-28">
    <header className="px-5 pt-8">
      <div className="flex items-center justify-between border-b border-primary/30 pb-4">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /><span className="sr-only">Voltar</span></button>
        <p className="font-display text-xl font-black tracking-tight text-foreground"><span className="text-primary">9</span>FIT PRO</p>
        <button type="button" onClick={() => navigate("/9fit/profile")} className="grid h-10 w-10 place-items-center rounded-full border border-primary/30 bg-card text-primary" aria-label="Abrir perfil"><CircleUserRound className="h-5 w-5" /></button>
      </div>
      <div className="mt-7 flex items-end justify-between">
        <div><p className="fit-os-label">ALL MODULES · 9 ACTIVE</p><h1 className="mt-1 font-display text-3xl font-black text-foreground">Ecosystem</h1></div>
        <Grid2X2 className="mb-1 h-5 w-5 text-primary" />
      </div>
    </header>
    <main className="mx-5 mt-5">
      {/* variant="dense" (21/09): listagem compacta em vez dos cards grandes de imagem - feedback do Rony: grid expandido estava pesado/cansativo */}
      <EcosystemGrid showHeader={false} showAll variant="dense" />
    </main>
    <BottomNavigation />
  </div>;
}
