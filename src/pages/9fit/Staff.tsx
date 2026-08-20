import { useEffect, useState } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Users, Calendar, MessageSquare, Bot, ChevronRight, Briefcase, Stethoscope, Apple } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { toast } from "sonner";

type Pro = {
  user_id: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Master Coach",
  super_admin: "Master Coach",
  trainer: "Personal Trainer",
  professor: "Professor",
  nutritionist: "Nutricionista",
};

const SERVICES_BY_ROLE: Record<string, { key: string; name: string; desc: string; icon: any; appointmentType: string; durationMin: number }[]> = {
  default: [
    { key: "consultoria", name: "Consultoria 1:1", desc: "30 min · vídeo-chamada", icon: Briefcase, appointmentType: "consultoria", durationMin: 30 },
    { key: "avaliacao", name: "Avaliação Física", desc: "Postural + bioimpedância", icon: Stethoscope, appointmentType: "avaliacao_fisica", durationMin: 45 },
    { key: "aula", name: "Aula Presencial", desc: "Sessão de 50 min", icon: Calendar, appointmentType: "aula", durationMin: 50 },
  ],
  nutritionist: [
    { key: "plano", name: "Plano Alimentar", desc: "Personalizado · 4 semanas", icon: Apple, appointmentType: "plano_alimentar", durationMin: 45 },
    { key: "consultoria", name: "Consultoria Nutri", desc: "45 min · vídeo-chamada", icon: Briefcase, appointmentType: "consultoria", durationMin: 45 },
  ],
};

export default function NineFitStaff() {
  const navigate = useNavigate();
  const { athleteId, athleteName } = useAthleteId();
  const [tab, setTab] = useState<"team" | "support" | "schedule">("team");
  const [pros, setPros] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pro | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, role, avatar_url")
        .in("role", ["admin", "professor"] as any)
        .eq("is_active", true)
        .limit(40);
      if (error) {
        console.error(error);
      } else {
        setPros((data as any) || []);
      }
      setLoading(false);
    })();
  }, []);

  const services = selected ? (SERVICES_BY_ROLE[selected.role] || SERVICES_BY_ROLE.default) : [];

  const bookService = async (svc: { key: string; name: string; appointmentType: string; durationMin: number }) => {
    if (!selected) return;
    if (!athleteId) {
      toast.error("Não encontramos seu perfil de aluno. Tente novamente em instantes.");
      return;
    }

    setBooking(true);
    try {
      // Próximo horário disponível provisório (hoje + 1h, arredondado) — o professor confirma o horário definitivo na Agenda dele
      const when = new Date();
      when.setMinutes(0, 0, 0);
      when.setHours(when.getHours() + 1);

      const { error } = await supabase.from("appointments").insert({
        student_id: athleteId,
        teacher_id: selected.user_id,
        title: `${svc.name} — ${athleteName || ""}`.trim(),
        appointment_type: svc.appointmentType,
        scheduled_at: when.toISOString(),
        duration: svc.durationMin,
        status: "scheduled",
        notes: `Solicitado via Staff pelo aluno. Horário provisório — aguardando confirmação de ${selected.full_name}.`,
      });

      if (error) throw error;

      toast.success(`Solicitação enviada para ${selected.full_name}. Você será notificado quando confirmar.`);
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
        <p className="text-xs font-data text-muted-foreground uppercase tracking-widest mt-1">Equipe · Serviços · Agendamento</p>
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
        <div className="px-4 space-y-2">
          {loading && <p className="text-[10px] text-muted-foreground">Carregando profissionais...</p>}
          {!loading && pros.length === 0 && (
            <div className="glass-mission rounded-xl p-6 text-center text-xs text-muted-foreground">
              Nenhum profissional ativo no momento.
            </div>
          )}
          {pros.map((p) => (
            <button
              key={p.user_id}
              onClick={() => setSelected(p)}
              className="w-full glass-mission rounded-xl p-3 flex items-center gap-3 text-left hover:bg-primary/5 transition"
            >
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-sm font-display text-primary overflow-hidden">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                ) : (
                  (p.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display uppercase text-foreground truncate">{p.full_name}</p>
                <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[p.role] || p.role}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-primary" />
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
            <Users className="w-5 h-5 text-primary" />
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

      {/* Sheet: serviços do profissional */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="bg-card border-primary/30 rounded-t-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display uppercase tracking-wider">{selected.full_name}</SheetTitle>
                <SheetDescription className="text-xs uppercase tracking-widest text-primary/80">
                  {ROLE_LABEL[selected.role] || selected.role} · Serviços disponíveis
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                {services.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => bookService(s)}
                    disabled={booking}
                    className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/40 transition flex items-center gap-3 text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                      <s.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-display uppercase">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </button>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <BottomNavigation />
    </div>
  );
}
