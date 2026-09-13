import { ArrowLeft, Grid2X2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { ModuleGrid } from "@/components/9fit/ModuleGrid";

export default function NineFitModules() {
  const navigate = useNavigate();
  return <div className="fit-os-grid min-h-screen bg-background pb-28">
    <header className="flex items-center gap-3 px-5 pt-8">
      <button type="button" onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center border border-white/10 nine-pro-clip" aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></button>
      <div><p className="fit-os-label">9FIT // NATIVE SYSTEM</p><h1 className="font-display text-3xl font-black text-foreground">Módulos</h1></div>
    </header>
    <section className="mx-5 mt-6 fit-os-panel fit-os-grid bg-card/70 p-5">
      <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center bg-primary/15 text-primary nine-pro-clip"><Grid2X2 className="h-5 w-5" /></div><div><p className="fit-os-label">Native grid / individual</p><h2 className="mt-1 text-lg font-bold">Seu ecossistema, por função</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Abra cada módulo de forma independente. O Início continua reservado para estado e ação principal.</p></div></div>
      <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-[10px] text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> Recomendados aparecem com destaque sutil.</div>
    </section>
    <main className="mx-5 mt-6"><ModuleGrid /></main>
    <BottomNavigation />
  </div>;
}
