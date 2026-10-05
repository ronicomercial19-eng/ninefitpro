import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { ProtocolViewer, ProtocolListItem } from "@/components/9fit/ProtocolViewer";
import { Library, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { businessDate } from "@/services/dailyContextRules";

const NINE_LIMA_ERRORS: Record<string, string> = {
  treino_do_dia_ja_iniciado: "Você já iniciou o treino de hoje. Aplique o protocolo amanhã.",
  nenhum_protocolo_para_o_perfil: "Ainda não há protocolo disponível para o seu perfil.",
  protocolo_nao_encontrado: "Protocolo não encontrado.",
};

export default function Protocolo() {
  const navigate = useNavigate();
  const { athleteId } = useAthleteId();
  const [items, setItems] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingNineLima, setApplyingNineLima] = useState(false);

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

  const applyNineLima = async () => {
    if (!athleteId) {
      toast.error("Perfil do atleta ainda não carregou. Tente novamente em alguns segundos.");
      return;
    }
    setApplyingNineLima(true);
    const { data, error } = await supabase.rpc("fn_aplicar_nine_lima" as any, {
      p_athlete_id: athleteId,
      p_data: businessDate(),
    });
    setApplyingNineLima(false);
    if (error) {
      console.error("[Protocolo] fn_aplicar_nine_lima", error);
      toast.error("Não foi possível aplicar o protocolo NINE/LIMA", { description: error.message || "Verifique seu acesso e tente novamente." });
      return;
    }
    const res = data as { success?: boolean; error?: string; protocol_name?: string } | null;
    if (!res?.success) {
      toast.error("Protocolo não aplicado", { description: NINE_LIMA_ERRORS[res?.error || ""] || "Tente novamente em instantes." });
      return;
    }
    toast.success(`Protocolo ${res.protocol_name || "NINE/LIMA"} aplicado ao treino de hoje.`);
    navigate("/9fit/train");
  };


  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-label">9FIT • LIBRARY</p>
        <h1 className="text-display text-3xl mt-1">Seu Protocolo</h1>
        <p className="text-sm text-muted-foreground mt-1">Conteúdos atribuídos pelo seu coach.</p>
      </div>

      <div className="px-4">
        <div className="mb-4 rounded-3xl border border-primary/30 bg-primary/[0.07] p-4 shadow-[0_16px_40px_-24px_hsl(var(--primary)/0.7)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-primary font-bold">NINE/LIMA</p>
              <h2 className="mt-1 font-display text-lg text-foreground">Protocolo base inteligente</h2>
              <p className="mt-1 text-xs text-muted-foreground">Aplica o protocolo NINE/LIMA no treino de hoje usando seu perfil de atleta.</p>
            </div>
            <button
              type="button"
              onClick={applyNineLima}
              disabled={applyingNineLima || !athleteId}
              className="shrink-0 rounded-2xl bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 flex items-center gap-2"
            >
              {applyingNineLima ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Ativar
            </button>
          </div>
        </div>

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
