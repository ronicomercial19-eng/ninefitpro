import { useState } from "react";
import {
  rhythmCategories,
  rhythmSeries,
  type RhythmEntry,
  type RhythmCategory,
} from "./hubRhythm";
import "./hub-record-bars.css";

const tones = {
  Água: "#6cc9e8",
  Nutrição: "#f4b776",
  Treino: "#f28c64",
  Mente: "#b3a0ec",
};
const units = {
  Água: "ml",
  Nutrição: "refeições",
  Treino: "sessões",
  Mente: "pausas",
};
export function HubRecordBars({
  entries,
  endDate,
  selectedDate,
  onSelectDate,
}: {
  entries: readonly RhythmEntry[];
  endDate: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const [category, setCategory] = useState<RhythmCategory>("Água");
  const series = rhythmSeries(entries, category, endDate);
  const max = Math.max(1, ...series.map((point) => point.value));
  const total = series.reduce((sum, point) => sum + point.value, 0);
  return (
    <section className="hub-record-bars" aria-label="Registros em barras">
      <div
        className="hub-record-categories"
        role="group"
        aria-label="Categoria do gráfico"
      >
        {rhythmCategories.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={item === category}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="hub-record-total">
        <span>ÚLTIMOS 7 DIAS</span>
        <strong>
          {total.toLocaleString("pt-BR")}{" "}
          <small>
            {units[category]} na semana
          </small>
        </strong>
      </div>
      <div
        className="hub-record-columns"
        style={{ "--bar-color": tones[category] } as React.CSSProperties}
      >
        {series.map((point) => (
          <button
            type="button"
            className="hub-record-column"
            key={point.date}
            aria-pressed={point.date === selectedDate}
            aria-label={`${category}, ${point.date
              .split("-")
              .reverse()
              .join("/")}: ${point.value} ${
              units[category]
            }. Ver registros do dia`}
            onClick={() => onSelectDate(point.date)}
          >
            <span className="hub-record-value">
              {point.value.toLocaleString("pt-BR")}
            </span>
            <span className="hub-record-track">
              <span style={{ height: `${(point.value / max) * 100}%` }} />
            </span>
            <span className="hub-record-date">
              {point.date.slice(8)}/{point.date.slice(5, 7)}
            </span>
          </button>
        ))}
      </div>
      <p className="hub-record-caption">
        Toque em uma barra para ver os registros do dia.
        {category === "Treino" ? " Inclui treinos autorrelatados." : ""}
      </p>
    </section>
  );
}
