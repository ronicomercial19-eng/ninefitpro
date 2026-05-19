import { useEffect, useState } from "react";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { ProtocolViewer, ProtocolListItem } from "@/components/9fit/ProtocolViewer";
import { Library } from "lucide-react";

export default function Protocolo() {
  const { athleteId } = useAthleteId();
  const [items, setItems] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!athleteId) return;
    const { data } = await supabase
      .from("student_library_assignments")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("assigned_at", { ascending: false });
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [athleteId]);

  useRealtimeTable(
    { table: "student_library_assignments", event: "*", filter: athleteId ? `athlete_id=eq.${athleteId}` : undefined, enabled: !!athleteId },
    () => load()
  );

  const activeItems = items.filter(i => !i.completed_at);
  const doneItems = items.filter(i => i.completed_at);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-label">9FIT • LIBRARY</p>
        <h1 className="text-display text-3xl mt-1">Seu Protocolo</h1>
        <p className="text-sm text-muted-foreground mt-1">Conteúdos atribuídos pelo seu coach.</p>
      </div>

      <div className="px-4">
        {active ? (
          <ProtocolViewer
            assignment={active}
            onBack={() => setActive(null)}
            onComplete={() => { setActive(null); load(); }}
          />
        ) : loading ? (
          <div className="space-y-2">
            <div className="h-20 surface-card animate-pulse" />
            <div className="h-20 surface-card animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="surface-card p-8 text-center">
            <Library className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold">Nenhum protocolo atribuído.</p>
            <p className="text-xs text-muted-foreground mt-1">Quando seu coach atribuir um conteúdo, ele aparecerá aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeItems.length > 0 && (
              <div>
                <p className="text-label mb-2">ATIVOS ({activeItems.length})</p>
                <div className="space-y-2">
                  {activeItems.map(a => <ProtocolListItem key={a.id} a={a} onOpen={() => setActive(a)} />)}
                </div>
              </div>
            )}
            {doneItems.length > 0 && (
              <div>
                <p className="text-label mb-2">CONCLUÍDOS ({doneItems.length})</p>
                <div className="space-y-2 opacity-60">
                  {doneItems.map(a => <ProtocolListItem key={a.id} a={a} onOpen={() => setActive(a)} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
