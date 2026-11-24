import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { ChartNoAxesCombined, ChevronDown } from "lucide-react";
import { HubRhythmCharts } from "./HubRhythmCharts";

export function HubRhythmPanel({
  children,
  ...chart
}: ComponentProps<typeof HubRhythmCharts> & { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
      aria-label="Histórico visual da rotina"
    >
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-24 w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary">
            <ChartNoAxesCombined size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              Seu ritmo / 7 dias
            </span>
            <span className="mt-1 block text-sm font-semibold sm:text-base">
              {open ? "Recolher gráficos da rotina" : "Ver gráficos da rotina"}
            </span>
            <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">
              {chart.read === "unavailable"
                ? "Dados indisponíveis nesta leitura"
                : chart.read === "loading"
                ? "Consultando seus registros…"
                : "Água, nutrição, treino e mente"}
            </span>
          </span>
          <ChevronDown
            size={19}
            aria-hidden="true"
            className={`shrink-0 text-muted-foreground ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </h2>
      <div id={id} hidden={!open}>
        {open && (
          <div className="space-y-4 border-t border-white/10 p-3 sm:p-5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Toque em uma data para consultar o dia nos quatro gráficos. Cada
              curva tem sua própria escala; sem registro não significa atividade
              não realizada.
            </p>
            <HubRhythmCharts {...chart} />
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
