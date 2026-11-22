import { useId } from "react";
import { Brain, Droplets, Dumbbell, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { coverageLabel, type CoverageRead } from "./hubQuickCoverage";
import { rhythmCategories, rhythmCurve, rhythmSelection, rhythmSeries, type RhythmEntry } from "./hubRhythm";

const pillars = {
  Água: { icon: Droplets, tone: "water", className: "hub-rhythm-water", unit: "ml", singular: "ml" },
  Nutrição: { icon: Utensils, tone: "nutrition", className: "hub-rhythm-nutrition", unit: "refeições", singular: "refeição" },
  Treino: { icon: Dumbbell, tone: "training", className: "hub-rhythm-training", unit: "sessões", singular: "sessão" },
  Mente: { icon: Brain, tone: "mind", className: "hub-rhythm-mind", unit: "pausas", singular: "pausa" },
};
const number = new Intl.NumberFormat("pt-BR");
const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });

export function HubRhythmCharts({ entries, endDate, selectedDate, onSelectDate, read }: {
  entries: readonly RhythmEntry[]; endDate: string; selectedDate: string;
  onSelectDate: (date: string) => void; read: CoverageRead;
}) {
  const id = useId().replace(/:/g, "");
  return <div className="hub-rhythm-grid">
    {rhythmCategories.map((category, pillarIndex) => {
      const { icon: Icon, tone, className, unit, singular } = pillars[category];
      const series = rhythmSeries(entries, category, endDate);
      const point = series.find(point => point.date === selectedDate) ?? series[6];
      const days = series.filter(point => point.records > 0).length;
      const total = series.reduce((sum, point) => sum + point.value, 0);
      const curve = rhythmCurve(series);
      const selectedIndex = series.findIndex(point => point.date === selectedDate);
      const marker = curve.coordinates[selectedIndex];
      const gradientId = `${id}-${tone}`;
      return <article key={category} className={`hub-rhythm-card ${className}`} aria-label={category} aria-busy={read === "loading"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-3 font-semibold"><span className="hub-rhythm-icon"><Icon className="size-5" aria-hidden="true" /></span><span><span className="hub-rhythm-eyebrow" aria-hidden="true">Ritmo / 0{pillarIndex + 1}</span><span className="mt-1 block text-lg">{category}</span></span></h3>
          <span className="hub-rhythm-coverage" aria-label={coverageLabel(read, days)}>{read === "ready" ? `${days}/7 dias` : read === "loading" ? "Carregando…" : "Indisponível"}</span>
        </div>
        <div className="hub-rhythm-value" aria-live="polite" aria-atomic="true">
          <p className="text-xs text-muted-foreground">{selectedDate.split("-").reverse().join("/")}{selectedDate === endDate ? " · Hoje" : ""}</p>
          <p className="hub-rhythm-number">{read !== "ready" ? "—" : !point?.records ? "Sem registro" : <>{number.format(point.value)} <span className="text-sm font-medium">{point.value === 1 ? singular : unit}</span></>}</p>
          <p className="min-h-5 text-xs text-muted-foreground">{read === "loading" ? "Lendo seus registros" : read === "unavailable" ? "Não foi possível confirmar os dados" : category === "Treino" && point?.records ? `${point.records - point.selfReported} concluídas · ${point.selfReported} autorrelatadas` : !point?.records ? "Seu próximo registro começa aqui." : "Registros do dia selecionado"}</p>
        </div>
        <div className="hub-rhythm-plot">
          {read === "ready" ? <svg viewBox="0 0 300 132" preserveAspectRatio="none" role="img" aria-label={`${category}: ${series.map(point => `${point.date}: ${point.records ? `${point.value} ${unit}` : "sem registro"}`).join("; ")}`}>
            <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop className="hub-rhythm-gradient-top" offset="0%" /><stop className="hub-rhythm-gradient-bottom" offset="100%" /></linearGradient></defs>
            <path className="hub-rhythm-gridline" d="M12 24 H288 M12 68 H288" /><path className="hub-rhythm-baseline" d="M12 112 H288" />
            <path d={curve.area} fill={`url(#${gradientId})`} />
            <path className="hub-rhythm-line" vectorEffect="non-scaling-stroke" d={curve.line} />
            {marker && <line className="hub-rhythm-guide" x1={marker.x} x2={marker.x} y1="12" y2="124" />}
            {curve.coordinates.map((position, index) => <circle key={index} className={index === selectedIndex ? "hub-rhythm-dot selected" : "hub-rhythm-dot"} cx={position.x} cy={position.y} r={index === selectedIndex ? 4 : 2} />)}
          </svg> : <div className="hub-rhythm-placeholder">{read === "loading" ? "Carregando curva…" : "Curva indisponível"}</div>}
        </div>
        <div className="grid grid-cols-7 gap-0" role="group" aria-label={`Selecionar dia · ${category}`}>
          {series.map(point => <Button key={point.date} variant="ghost" className="hub-rhythm-day" aria-label={`${category} · ${point.date.split("-").reverse().join("/")}`} aria-pressed={selectedDate === point.date}
            onClick={() => onSelectDate(point.date)} onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const dates = series.map(point => point.date);
              const next = rhythmSelection(dates, point.date, event.key);
              onSelectDate(next);
              const group = event.currentTarget.parentElement;
              const nextButton = group?.querySelectorAll<HTMLButtonElement>("button")[dates.indexOf(next)];
              nextButton?.focus();
            }}><span className="hub-rhythm-weekday">{weekday.format(new Date(point.date + "T12:00:00Z")).replace(".", "")}</span><span>{point.date.slice(8)}</span></Button>)}
        </div>
        <footer className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-border/10 pt-3 text-xs text-muted-foreground">
          <span><span className="hub-rhythm-eyebrow block">Últimos 7 dias</span><span className="mt-1 block">Total semanal</span></span><strong className="hub-rhythm-accent text-base font-semibold tabular-nums">{read === "ready" ? `${number.format(total)} ${total === 1 ? singular : unit}` : "—"}</strong>
        </footer>
      </article>;
    })}
  </div>;
}