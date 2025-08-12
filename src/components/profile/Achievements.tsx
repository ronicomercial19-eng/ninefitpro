import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Achievement {
  id: string;
  achievement_name: string;
  achievement_type: string;
  points: number;
  description?: string;
  unlocked_at?: string;
}

export default function Achievements({ userEmail }: { userEmail: string }) {
  const [items, setItems] = useState<Achievement[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!userEmail) return;
      const { data } = await supabase
        .from("user_achievements")
        .select("id, achievement_name, achievement_type, points, description, unlocked_at")
        .eq("user_email", userEmail)
        .order("unlocked_at", { ascending: false });
      setItems(data || []);
    };
    run();
  }, [userEmail]);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Conquistas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <div className="text-gray-400 text-sm">Nenhuma conquista ainda.</div>
        )}
        {items.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-3 rounded-md bg-gray-800">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-white font-medium">{a.achievement_name}</div>
                <div className="text-gray-400 text-xs">{a.description}</div>
              </div>
            </div>
            <Badge variant="secondary">{a.points} pts</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
