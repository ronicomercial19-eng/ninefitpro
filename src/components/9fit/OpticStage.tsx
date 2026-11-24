import type { ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import "./optic-rhythm.css";
/** Natural scrolling: one main subject with a quiet preview of the next. No snapping or clipped content. */
export function OpticStage({
  id,
  children,
  next,
}: {
  id: string;
  children: ReactNode;
  next?: { id: string; label: string };
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      className="optic-stage"
      aria-label={
        id === "hub-sync"
          ? "Sync do dia"
          : id === "hub-records"
          ? "Registros do dia"
          : id === "train-preparation"
          ? "Preparação da sessão"
          : id === "train-workout"
          ? "Sessão de treino"
          : "Acompanhamento"
      }
    >
      <div className="optic-stage-content">{children}</div>
      {next && (
        <button
          type="button"
          className="optic-next"
          onClick={() => {
            const target = document.getElementById(next.id);
            target?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "instant"
                : "smooth",
              block: "start",
            });
            target?.focus({ preventScroll: true });
          }}
        >
          <span>
            <small>A SEGUIR</small>
            <strong>{next.label}</strong>
          </span>
          <ArrowDown size={18} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
