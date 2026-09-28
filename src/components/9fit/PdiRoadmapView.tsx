import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";

const MILESTONES = [
  { label: "Primeiros 10 Treinos", completed: true },
  { label: "Ajuste de Carga de Volume", completed: false },
  { label: "Dominância de Protocolo 9", completed: false },
];

export function PdiRoadmapView() {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Roadmap de Conquistas</h3>
      <div className="space-y-4">
        {MILESTONES.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            {m.completed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
            <span className={`text-sm ${m.completed ? "text-foreground" : "text-muted-foreground"}`}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
