import { useRef, useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import "./module-hologram.css";
export type HologramModule = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  color: string;
  available: boolean;
  status: string;
  onOpen: () => void;
};
export function ModuleHologram({ modules }: { modules: HologramModule[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const current = Math.min(index, modules.length - 1);
  const module = modules[current];
  if (!module) return null;
  const move = (delta: number) =>
    setIndex((current + delta + modules.length) % modules.length);
  const Icon = module.icon;
  return (
    <section
      className={`module-hologram ${paused ? "holo-paused" : ""}`}
      aria-label="Explorador de módulos"
      aria-roledescription="carrossel"
      style={{ "--holo-accent": module.color } as CSSProperties}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      <div className="holo-topline">
        <span>9FIT / EXPLORE</span>
        <span>
          {String(current + 1).padStart(2, "0")} /{" "}
          {String(modules.length).padStart(2, "0")}
        </span>
      </div>
      <div className="holo-stage">
        <button
          type="button"
          className="holo-previous"
          aria-label="Módulo anterior"
          onClick={() => move(-1)}
          disabled={modules.length < 2}
        >
          <ChevronLeft size={22} />
        </button>
        <div
          className="holo-projection"
          aria-hidden="true"
          onPointerDown={(event) => {
            touch.current = event.clientX;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (
              touch.current !== null &&
              Math.abs(event.clientX - touch.current) > 45
            )
              move(event.clientX < touch.current ? 1 : -1);
            touch.current = null;
          }}
          onPointerCancel={() => {
            touch.current = null;
          }}
        >
          <div className="holo-orbit holo-orbit-one" />
          <div className="holo-orbit holo-orbit-two" />
          <div className="holo-orbit holo-orbit-three" />
          <div className="holo-core" key={module.id}>
            <div className="holo-core-face">
              <Icon size={72} strokeWidth={1} />
              <span>9 / {String(current + 1).padStart(2, "0")}</span>
            </div>
          </div>
          <div className="holo-platform" />
          <div className="holo-beam" />
        </div>
        <button
          type="button"
          className="holo-next"
          aria-label="Próximo módulo"
          onClick={() => move(1)}
          disabled={modules.length < 2}
        >
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="holo-information" aria-live="polite" aria-atomic="true">
        <span className="holo-category">{module.category}</span>
        <h2>{module.name}</h2>
        <p>{module.description}</p>
        <span className="holo-status">{module.status}</span>
      </div>
      <button
        type="button"
        className="holo-open"
        disabled={!module.available}
        onClick={module.onOpen}
      >
        Abrir {module.name}
        <ArrowUpRight size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="holo-motion-control"
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
      >
        {paused ? "Retomar efeito" : "Pausar efeito"}
      </button>
      <p className="holo-hint">
        Deslize o holograma ou use as setas para explorar.
      </p>
      <nav className="holo-selector" aria-label="Escolher módulo">
        {modules.map((item, i) => {
          const ItemIcon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              aria-pressed={current === i}
              onClick={() => setIndex(i)}
            >
              <ItemIcon size={19} strokeWidth={1.5} aria-hidden="true" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}
