import { useEffect, useState } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Calendar, MessageSquare, Bot, ChevronRight, MapPin, Star, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { toast } from "sonner";
import { steventApi, SteventProfessional, SteventMethod } from "@/services/stevent.service";

export default function NineFitStaff() {
  const navigate = useNavigate();
  const { athleteId, athleteName } = useAthleteId();
  const [tab, setTab] = useState<"team" | "support" | "schedule">("team");
  const [pros, setPros] = useState<SteventProfessional[]>([]);
  const [methods, setMethods] = useState<SteventMethod[]>([]);
  const [methodFilter, setMethodFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SteventProfessional | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [methodsList, prosList] = await Promise.all([
          steventApi.getMethods(),
          steventApi.getProfessionals(methodFilter ? { method: methodFilter } : undefined),
        ]);
        setMethods(methodsList);
        setPros(prosList);
      } catch (e: any) {
        console.error(e);
        setError("Não foi possível carregar os profissionais agora. Tente novamente em instantes.");
      } finally {
        setLoading(false);
      }
    })();
  }, [methodFilter]);

  const bookService = async (methodId: string) => {
    if (!selected) return;
    if (!athleteId) {
      toast.error("Não encontramos seu perfil de aluno. Tente novamente em instantes.");
      return;
    }

    setBooking(true);
    try {
      // 1. Registra a intenção de agendamento na Stevent (dados reais do profissional)
      await steventApi.book({
        freelancer_id: selected.id,
        method: methodId,
        client_id: athleteId,
        client_name: athleteName || undefined,
        notes: "Solicitado via app FitPro (Staff)",
      });

      // 2. Espelha no FitPro (appointments) — pra aparecer na Agenda/notificações/créditos do aluno
      const when = new Date();
      when.setMinutes(0, 0, 0);
      when.setHours(when.getHours() + 1);
      const methodLabel = methods.find((m) => m.id === methodId)?.name || methodId;

      const { error: apptError } = await supabase.from("appointments").insert({
        student_id: athleteId,
        title: `${methodLabel} — ${selected.name}`,
        appointment_type: methodId,
        scheduled_at: when.toISOString(),
        duration: 60,
        status: "scheduled",
        notes: `Profissional (Stevent): ${selected.name} · ${selected.contact?.whatsapp || selected.contact?.email || ""}. Horário provisório — aguardando confirmação.`,
      });
      if (apptError) console.error("Erro ao espelhar em appointments:", apptError);

      toast.success(`Solicitação enviada para ${selected.name}. Você será notificado quando confirmar.`);
      setSelected(null);
      navigate("/9fit/aulas-creditos");
    } catch (e: any) {
      toast.error("Erro ao agendar: " + e.message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // STAFF</p>
        <h1 className="text-massive text-3xl text-foreground mt-1">SUPPORT ELITE</h1>
        <p className="text-xs font-data text-muted-foreground uppercase tracking-widest mt-1">
          Equipe · Serviços · Agendamento — via Stevent
        </p>
      </div>

      <div className="px-4 mb-4">
        <div className="glass-mission rounded-full p-1 flex gap-1">
          {[
            { k: "team", l: "Equipe" },
            { k: "schedule", l: "Agenda" },
            { k: "support", l: "Suporte" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`flex-1 py-2 rounded-full text-[10px] font-display uppercase tracking-widest transition-all ${
                tab === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate("/9fit/ron")}
        className="mx-4 mb-4 w-[calc(100%-2rem)] glass-mission glass-mission-active rounded-xl p-4 text-left flex items-center gap-3"
      >
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-data tracking-[0.3em] text-primary/80">ASSISTENTE NEURAL</p>
          <p className="text-editorial text-base text-foreground">O RON</p>
          <p className="text-[10px] text-muted-foreground">Disponível 24/7 · memória persistente</p>
        </div>
        <ChevronRight className="w-5 h-5 text-primary" />
      </button>

      {tab === "team" && (
        <div className="px-4 space-y-3">
          {/* Filtro por método (catálogo real da Stevent) */}
          {methods.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setMethodFilter(undefined)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider border ${
                  !methodFilter ? "bg-primary text-primary-foreground border-primary" : "border-white/10 text-muted-foreground"
                }`}
              >
                Todos
              </button>
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethodFilter(m.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider border whitespace-nowrap ${
                    methodFilter === m.id ? "bg-primary text-primary-foreground border-primary" : "border-white/10 text-muted-foreground"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="glass-mission rounded-xl p-6 text-center text-xs text-destructive">{error}</div>
          )}
          {!loading && !error && pros.length === 0 && (
            <div className="glass-mission rounded-xl p-6 text-center text-xs text-muted-foreground">
              Nenhum profissional disponível para esse método no momento.
            </div>
          )}
          {!loading && pros.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="w-full glass-mission rounded-xl p-3 flex items-center gap-3 text-left hover:bg-primary/5 transition"
            >
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-sm font-display text-primary overflow-hidden shrink-0">
                {(p.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display uppercase text-foreground truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{p.role}</p>
                {p.location && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {p.location}
                  </p>
                )}
              </div>
              {typeof p.match_score === "number" && p.match_score > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-primary shrink-0">
                  <Star className="w-3 h-3 fill-primary" /> {p.match_score}
                </div>
              )}
              <ChevronRight className="w-4 h-4 text-primary shrink-0" />
            </button>
          ))}
        </div>
      )}

      {tab === "schedule" && (
        <div className="px-4 space-y-2">
          <button onClick={() => navigate("/9fit/aulas-creditos")} className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display uppercase">Minha Agenda</p>
              <p className="text-[10px] text-muted-foreground">Aulas, créditos e reservas</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => setTab("team")} className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display uppercase">Agendar com um profissional</p>
              <p className="text-[10px] text-muted-foreground">Escolha na aba Equipe</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {tab === "support" && (
        <div className="px-4 space-y-2">
          <button onClick={() => navigate("/9fit/mensagens")} className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display uppercase">Chat de Suporte</p>
              <p className="text-[10px] text-muted-foreground">Resposta em até 4 min</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Sheet: métodos disponíveis com o profissional selecionado */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="bg-card border-primary/30 rounded-t-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display uppercase tracking-wider">{selected.name}</SheetTitle>
                <SheetDescription className="text-xs uppercase tracking-widest text-primary/80">
                  {selected.role} · Escolha o método
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto">
                {(selected.skills?.length ? methods.filter((m) => selected.skills.some((s) => s.toLowerCase().includes(m.id) || m.name.toLowerCase().includes(s.toLowerCase()))) : methods).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => bookService(m.id)}
                    disabled={booking}
                    className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/40 transition flex items-center gap-3 text-left disabled:opacity-50"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-display uppercase">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.category} · {m.format}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </button>
                ))}
                {(!methods.length) && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum método cadastrado.</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <BottomNavigation />
    </div>
  );
}
