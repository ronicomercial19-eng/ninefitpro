import { Flame, Zap, Dumbbell, Trophy } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

const stats = [
  { label: "Total XP", value: "8,500", icon: Zap, color: "text-neon-400" },
  { label: "Current Level", value: "12", icon: Trophy, color: "text-yellow-500" },
  { label: "Day Streak", value: "7", icon: Flame, color: "text-orange-500" },
  { label: "Workouts", value: "45", icon: Dumbbell, color: "text-blue-400" },
];

const weeklyData = [
  { day: "Mon", value: 80 },
  { day: "Tue", value: 65 },
  { day: "Wed", value: 90 },
  { day: "Thu", value: 45 },
  { day: "Fri", value: 100 },
  { day: "Sat", value: 70 },
  { day: "Sun", value: 0 },
];

const achievements = [
  { id: "1", name: "First Workout", description: "Complete your first workout", unlocked: true },
  { id: "2", name: "Week Warrior", description: "7 day streak", unlocked: true },
  { id: "3", name: "Century", description: "100 workouts completed", unlocked: false },
  { id: "4", name: "Early Bird", description: "5 workouts before 7 AM", unlocked: false },
];

export default function NineFitStats() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
          Progress
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-dark-800 border border-dark-700 rounded-sm p-4"
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-black text-foreground">{stat.value}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly Activity */}
      <div className="px-4 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
          Weekly Activity
        </h2>

        <div className="bg-dark-800 border border-dark-700 rounded-sm p-4">
          <div className="flex items-end justify-between h-32 gap-2">
            {weeklyData.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-sm transition-all ${
                      day.value > 0 ? "bg-neon-400" : "bg-dark-700"
                    }`}
                    style={{ height: `${day.value}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 uppercase">
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
          Achievements
        </h2>

        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`flex items-center gap-3 p-4 rounded-sm border transition-colors ${
                achievement.unlocked
                  ? "bg-neon-400/10 border-neon-400/30"
                  : "bg-dark-800 border-dark-700 opacity-60"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  achievement.unlocked ? "bg-neon-400" : "bg-dark-700"
                }`}
              >
                <Trophy
                  className={`w-5 h-5 ${
                    achievement.unlocked ? "text-primary-foreground" : "text-gray-500"
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  {achievement.name}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">
                  {achievement.description}
                </p>
              </div>
              {achievement.unlocked && (
                <span className="text-[10px] text-neon-400 font-bold uppercase">
                  Unlocked
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
