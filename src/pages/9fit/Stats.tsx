import { Flame, Dumbbell, Trophy, Calendar } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

const stats = [
  { label: "Total Calorias", value: "8.500", icon: Flame, color: "text-orange-500", unit: "kcal" },
  { label: "Sequência", value: "7", icon: Calendar, color: "text-primary", unit: "dias" },
  { label: "Treinos", value: "45", icon: Dumbbell, color: "text-blue-400", unit: "sessões" },
  { label: "Conquistas", value: "12", icon: Trophy, color: "text-yellow-500", unit: "total" },
];

const weeklyData = [
  { day: "Seg", value: 80, calories: 320 },
  { day: "Ter", value: 65, calories: 260 },
  { day: "Qua", value: 90, calories: 360 },
  { day: "Qui", value: 45, calories: 180 },
  { day: "Sex", value: 100, calories: 400 },
  { day: "Sáb", value: 70, calories: 280 },
  { day: "Dom", value: 0, calories: 0 },
];

const achievements = [
  { id: "1", name: "Primeiro Treino", description: "Complete seu primeiro treino", unlocked: true },
  { id: "2", name: "Guerreiro da Semana", description: "7 dias de sequência", unlocked: true },
  { id: "3", name: "Centenário", description: "100 treinos completados", unlocked: false },
  { id: "4", name: "Madrugador", description: "5 treinos antes das 7h", unlocked: false },
];

export default function NineFitStats() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
          Progresso
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-sm p-4"
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-black text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly Activity */}
      <div className="px-4 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
          Atividade Semanal
        </h2>

        <div className="bg-card border border-border rounded-sm p-4">
          <div className="flex items-end justify-between h-32 gap-2">
            {weeklyData.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-sm transition-all ${
                      day.value > 0 ? "bg-primary" : "bg-muted"
                    }`}
                    style={{ height: `${day.value}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase">
                  {day.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="px-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
          Conquistas
        </h2>

        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`flex items-center gap-3 p-4 rounded-sm border transition-colors ${
                achievement.unlocked
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card border-border opacity-60"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  achievement.unlocked ? "bg-primary" : "bg-muted"
                }`}
              >
                <Trophy
                  className={`w-5 h-5 ${
                    achievement.unlocked ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  {achievement.name}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  {achievement.description}
                </p>
              </div>
              {achievement.unlocked && (
                <span className="text-[10px] text-primary font-bold uppercase">
                  Desbloqueado
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
