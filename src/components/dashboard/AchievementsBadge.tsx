
import { Card } from "@/components/ui/card";

export const AchievementsBadge = () => {
  const achievements = [
    {
      title: "Primeira Semana",
      description: "Complete 7 dias consecutivos",
      icon: "🏃‍♂️",
      unlocked: true
    },
    {
      title: "Força Bruta", 
      description: "Aumente 20% sua carga",
      icon: "💪",
      unlocked: true
    },
    {
      title: "Consistência",
      description: "30 dias de treino",
      icon: "🔥",
      unlocked: false
    }
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Conquistas Recentes</h3>
      
      <div className="space-y-4">
        {achievements.map((achievement, index) => (
          <div 
            key={index}
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              achievement.unlocked 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-gray-50 dark:bg-gray-800 opacity-60'
            }`}
          >
            <div className="text-2xl">{achievement.icon}</div>
            <div className="flex-1">
              <p className="font-medium text-sm">{achievement.title}</p>
              <p className="text-xs text-muted-foreground">{achievement.description}</p>
            </div>
            {achievement.unlocked && (
              <div className="text-green-500 text-sm">✓</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
