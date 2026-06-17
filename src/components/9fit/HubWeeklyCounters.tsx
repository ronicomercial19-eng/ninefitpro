import { useNavigate } from "react-router-dom";
import { Dumbbell, Apple, Activity, ArrowRight } from "lucide-react";

interface Props {
  treinos: number;
  nutri: number;
  minutos: number;
}

export function HubWeeklyCounters({ treinos, nutri, minutos }: Props) {
  const navigate = useNavigate();
  const items = [
    { label: "TREINO",  value: treinos, suffix: "/sem", Icon: Dumbbell, cta: "Registrar",  route: "/9fit/train" },
    { label: "NUTRI",   value: nutri,   suffix: "/sem", Icon: Apple,    cta: "Logar",      route: "/9fit/foods" },
    { label: "MOVE",    value: minutos, suffix: "min",  Icon: Activity, cta: "Adicionar",  route: "/9fit/habitflow" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ label, value, suffix, Icon, cta, route }) => {
        const zero = !value || value === 0;
        return (
          <div key={label} className="surface-card p-3 flex flex-col items-center text-center">
            <Icon className="w-4 h-4 text-primary mb-1" />
            <p className="text-label">{label}</p>
            <p className={`font-data text-2xl ${zero ? "text-muted-foreground" : "text-foreground"}`}>
              {value || 0}
              <span className="text-[10px] text-muted-foreground ml-1">{suffix}</span>
            </p>
            {zero && (
              <button
                onClick={() => navigate(route)}
                className="mt-1 text-[10px] font-semibold text-primary inline-flex items-center gap-1"
              >
                {cta} <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
