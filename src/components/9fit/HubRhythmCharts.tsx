import { useId } from "react";
import { Brain, Droplets, Dumbbell, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { coverageLabel, type CoverageRead } from "./hubQuickCoverage";
import { rhythmCategories, rhythmCurve, rhythmSelection, rhythmSeries, type RhythmEntry } from "./hubRhythm";

const pillars = {
  Água: { icon: Droplets, tone: "water", unit: "ml" },
  Nutrição: { icon: Utensils, tone: "nutrition", unit: "refeições" },
  Treino: { icon: Dumbbell, tone: "training", unit: "sessões" },
  Mente: { icon: Brain, tone: "mind", unit: "pausas" },
};
const number = new Intl.NumberFormat("pt-BR");

export function HubRhythmCharts({ entries, endDate, selectedDate, onSelectDate, read }: {
  entries: readonly RhythmEntry[]; endDate: string; selectedDate: string;
  onSelectDate: (date: string) => void; read: CoverageRead;
}) {
  const id = useId().replace(/:/g, "");
  return <div className="hub-rhythm-grid">
    {rhythmCategories.map(category => {
      const { icon: Icon, tone, unit } = pillars[category];
      const series = rhythmSeries(entries, category, endDate);
      const point = series.find(point => point.date === selectedDate) ?? series[6];
      const days = series.filter(point => point.records > 0).length;
      const total = series.reduce((sum, point) => sum + point.value, 0);
      const curve = rhythmCurve(series);
      const selectedIndex = series.findIndex(point => point.date === selectedDate);
      const marker = curve.coordinates[selectedIndex];
      const gradientId = `${id}-${tone}`;
      return <article key={category} className={`hub-rhythm-card hub-rhythm-${tone}`} aria-label={category} aria-busy={read === "loading"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold"><Icon className="hub-rhythm-accent size-5" aria-hidden="true" />{category}</h3>
          <span className="text-xs text-muted-foreground" aria-label={coverageLabel(read, days)}>{read === "ready" ? `${days}/7 dias` : read === "loading" ? "Carregando…" : "Indisponível"}</span>
        </div>
        <div className="hub-rhythm-value" aria-live="polite" aria-atomic="true">
          <p className="text-xs text-muted-foreground">{selectedDate.split("-").reverse().join("/")}{selectedDate === endDate ? " · Hoje" : ""}</p>
          <p className="hub-rhythm-number">{read !== "ready" ? "—" : !point?.records ? "Sem registro" : <>{number.format(point.value)} <span className="text-sm font-medium">{unit}</span></>}</p>
          <p className="min-h-5 text-xs text-muted-foreground">{read === "loading" ? "Lendo seus registros" : read === "unavailable" ? "Não foi possível confirmar os dados" : category === "Treino" && point?.records ? `${point.records - point.selfReported} concluídas · ${point.selfReported} autorrelatadas` : !point?.records ? "Seu próximo registro começa aqui." : "Registros do dia selecionado"}</p>
        </div>
        <div className="hub-rhythm-plot">
          {read === "ready" ? <svg viewBox="0 0 300 132" role="img" aria-label={`${category}: ${series.map(point => `${point.date}: ${point.records ? `${point.value} ${unit}` : "sem registro"}`).join("; ")}`}>
            <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop className="hub-rhythm-gradient-top" offset="0%" /><stop className="hub-rhythm-gradient-bottom" offset="100%" /></linearGradient></defs>
            <path className="hub-rhythm-baseline" d="M12 112 H288" />
            <path d={curve.area} fill={`url(#${gradientId})`} />
            <path className="hub-rhythm-line" d={curve.line} />
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
            }}>{point.date.slice(8)}</Button>)}
        </div>
        <footer className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-border/10 pt-3 text-xs text-muted-foreground">
          <span>Total semanal</span><strong className="hub-rhythm-accent">{read === "ready" ? `${number.format(total)} ${unit}` : "—"}</strong>
        </footer>
      </article>;
    })}
  </div>;
}