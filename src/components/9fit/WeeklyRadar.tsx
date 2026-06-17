import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";

interface Props {
  current: { treino: number; nutri: number; sono: number; mob: number; hidr: number };
  previous?: { treino: number; nutri: number; sono: number; mob: number; hidr: number };
}

export function WeeklyRadar({ current, previous }: Props) {
  const data = [
    { axis: "Treino", a: current.treino, b: previous?.treino || 0 },
    { axis: "Nutri", a: current.nutri, b: previous?.nutri || 0 },
    { axis: "Sono", a: current.sono, b: previous?.sono || 0 },
    { axis: "Mob", a: current.mob, b: previous?.mob || 0 },
    { axis: "Hidr", a: current.hidr, b: previous?.hidr || 0 },
  ];

  // Neon intensity scales with daily score (avg of all axes)
  const avg = (current.treino + current.nutri + current.sono + current.mob + current.hidr) / 5;
  const glow = Math.max(2, Math.min(18, (avg / 100) * 18));
  const opacity = Math.max(0.15, Math.min(0.55, avg / 200 + 0.15));

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-label">RADAR 5D — SEMANA</p>
        <span className="text-[10px] text-primary font-bold tracking-widest">SYNC {Math.round(avg)}%</span>
      </div>
      <div className="w-full h-56" style={{ filter: `drop-shadow(0 0 ${glow}px hsl(var(--primary) / ${opacity}))` }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="78%">
            <PolarGrid stroke="hsl(0 0% 100% / 0.08)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {previous && (
              <Radar name="Anterior" dataKey="b" stroke="hsl(0 0% 60%)" fill="hsl(0 0% 60%)" fillOpacity={0.05} strokeWidth={1} />
            )}
            <Radar
              name="Atual"
              dataKey="a"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={opacity}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
