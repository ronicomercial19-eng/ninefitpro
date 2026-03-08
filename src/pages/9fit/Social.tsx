import { useState, useEffect } from "react";
import { Trophy, Flame, Dumbbell, Star, Users } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonCard } from "@/components/9fit/SkeletonCard";

interface Achievement {
  id: string;
  name: string;
  level: number;
  total_xp: number;
  type: "level_up" | "streak" | "workout";
  message: string;
}

export default function NineFitSocial() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const { data } = await supabase
        .from("athletes")
        .select("id, name, total_xp, level")
        .gt("total_xp", 0)
        .order("total_xp", { ascending: false })
        .limit(20);

      if (data) {
        const feed: Achievement[] = data.map((a) => ({
          id: a.id,
          name: a.name.split(" ")[0],
          level: a.level || 1,
          total_xp: a.total_xp || 0,
          type: (a.level || 1) >= 5 ? "level_up" : "workout" as const,
          message:
            (a.level || 1) >= 5
              ? `Atingiu Nível ${a.level}! 🔥`
              : `Acumulou ${a.total_xp} XP de treinos`,
        }));
        setAchievements(feed);
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "level_up": return <Star className="w-5 h-5 text-yellow-500" />;
      case "streak": return <Flame className="w-5 h-5 text-orange-500" />;
      default: return <Dumbbell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
          Comunidade
        </h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
          Conquistas recentes dos atletas
        </p>
      </div>

      {/* Leaderboard */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Ranking
          </h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : achievements.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma atividade ainda. Complete treinos para aparecer aqui!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {achievements.map((a, i) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 p-3 rounded-sm border transition-all ${
                  i < 3
                    ? "bg-primary/10 border-primary/30"
                    : "bg-card border-border"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                  i === 0 ? "bg-yellow-500 text-yellow-950" :
                  i === 1 ? "bg-gray-300 text-gray-800" :
                  i === 2 ? "bg-orange-400 text-orange-950" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {a.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.message}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {getIcon(a.type)}
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary">Lv.{a.level}</p>
                    <p className="text-[10px] text-muted-foreground">{a.total_xp} XP</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
