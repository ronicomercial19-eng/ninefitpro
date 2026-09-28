import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { loadActiveSkillsFor, type ActiveSkill } from "@/services/skills/skillRuntime";
import { useAuth } from "@/contexts/AuthContext";

export function ActiveSkillsBadge() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<ActiveSkill[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    loadActiveSkillsFor(user.id).then((s) => setSkills(s.slice(0, 3)));
  }, [user?.id]);

  if (!skills.length) return null;

  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <p className="text-label">INTELIGÊNCIA ATIVA HOJE</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <span key={s.id} className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest bg-primary/[0.12] border border-primary/30 text-primary font-bold">
            {s.name}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        {skills.length} skill(s) calibrando suas recomendações em tempo real.
      </p>
    </div>
  );
}
