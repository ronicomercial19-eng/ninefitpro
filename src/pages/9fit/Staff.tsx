import { useRef, useState } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Users, Calendar, MessageSquare, ChevronRight, Briefcase, Stethoscope, Apple, UserPlus } from "lucide-react";
import { useNavigate,useLocation,useSearchParams } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useStaffDirectory } from "@/hooks/useStaffDirectory";

// Fluxo Staff (profissionais externos / eventos). Trocar pela rota final do fluxo quando a equipe definir.
const STAFF_FLOW_ROUTE = "/9fit/aulas-creditos?tab=schedule";

// Chat único: o botão flutuante (RonConciergeSheet) é o único chat. Aqui só abrimos ele na aba certa.
const openChat = (tab: "ron" | "team") =>
  window.dispatchEvent(new CustomEvent("9fit:open-ron-concierge", { detail: { tab } }));

type Pro = {
  user_id: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Treinador responsável",
  super_admin: "Treinador responsável",
  trainer: "Treinador pessoal",
  professor: "Professor",
  nutritionist: "Nutricionista",
};

const SERVICES_BY_ROLE: Record<string, { key: string; name: string; desc: string; icon: any }[]> = {
  default: [
    { key: "consultoria", name: "Consultoria 1:1", desc: "30 min · vídeo-chamada", icon: Briefcase },
    { key: "avaliacao", name: "Avaliação Física", desc: "Postural + bioimpedância", icon: Stethoscope },
    { key: "aula", name: "Aula Presencial", desc: "Sessão de 50 min", icon: Calendar },
  ],
  nutritionist: [
    { key: "plano", name: "Plano Alimentar", desc: "Personalizado · 4 semanas", icon: Apple },
    { key: "consultoria", name: "Consultoria Nutri", desc: "45 min · vídeo-chamada", icon: Briefcase },
  ],
};

export default function NineFitStaff() {
  const navigate = useNavigate();
  const location=useLocation();const [searchParams]=useSearchParams();
  const nutritionReview=(location.state as any)?.nutritionReview;
  const dietReview=searchParams.get("context")=="diet_review";
  const [tab, setTab] = useState<"team" | "support" | "schedule">("team");
  const directory = useStaffDirectory();
  const pros = directory.data || [];
  const loading = directory.isPending;
  const [selected, setSelected] = useState<Pro | null>(null);
  const teamRef = useRef<HTMLDivElement | null>(null);

  const visiblePros=dietReview?pros.filter(p=>p.role==="nutritionist"):pros;
  const services = selected ? (SERVICES_BY_ROLE[selected.role] || SERVICES_BY_ROLE.default) : [];
  // Equipe NINE disponível => aparece de cara. Ninguém disponível (ou erro) => fluxo Staff.
  const hasNinePros = !loading && !directory.isError && visiblePros.length > 0;

  const bookService = (svcKey: string) => {
    if (!selected) return;
    const service=svcKey === "avaliacao" ? "avaliacao_fisica" : svcKey === "plano" ? "consultoria" : svcKey;
    navigate(`/9fit/aulas-creditos?teacher_id=${encodeURIComponent(selected.user_id)}&service=${encodeURIComponent(service)}&tab=schedule`,{state:{nutritionReview}});
    setSelected(null);
  };

  const openStaffFlow = () => {
    if (hasNinePros) {
      setTab("team");
      requestAnimationFrame(() => teamRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    navigate(STAFF_FLOW_ROUTE, { state: { nutritionReview, source: "staff_fallback", dietReview } });
  };

  return (
    <div className="min-h-screen gradient-mission pb-28">
      {/* pt-16: espaço para o botão VOLTAR fixo (BackButton) não cobrir o título */}
      <div className="px-4 pt-16 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // EQUIPE</p>
        <h1 className="text-massive text-3xl text-foreground mt-1">{dietReview?"REVISÃO NUTRICIONAL":"SUPORTE EQUIPE"}</h1>
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

      {/* Card nativo da Staff: conexão aluno ↔ profissionais.
          O card "O RON" foi removido: o RON é o botão flutuante (chat único). */}
      <button
        onClick={openStaffFlow}
        disabled={loading}
        className="mx-4 mb-4 w-[calc(100%-2rem)] glass-mission glass-mission-active rounded-xl p-4 text-left flex items-center gap-3 disabled:opacity-60"
      >
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          {hasNinePros ? <Users className="w-6 h-6 text-primary" /> : <UserPlus className="w-6 h-6 text-primary" />}
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-data tracking-[0.3em] text-primary/80">{hasNinePros ? "EQUIPE NINE" : "STAFF 9FIT"}</p>
          <p className="text-editorial text-base text-foreground">{hasNinePros ? "FALAR COM A EQUIPE" : "SOLICITAR PROFISSIONAL"}</p>
          <p className="text-[10px] text-muted-foreground">
            {loading ? "Verificando disponibilidade..." : hasNinePros ? `${visiblePros.length} profissional(is) disponível(is)` : "Conectamos você com um profissional da Staff"}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-primary" />
      </button>

      {tab === "team" && (
        <div ref={teamRef} className="px-4 space-y-2 scroll-mt-20">
          <button
            type="button"
            onClick={() => navigate('/9fit/native-system?app=staff')}
            className="w-full glass-mission glass-mission-active rounded-2xl p-5 text-left flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Abrir fluxo 9FIT Staff: Cliente ou Staff / Prof"
          >
            <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/20 grid place-items-center"><Briefcase className="w-6 h-6 text-primary" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-data tracking-[0.3em] text-primary">9FIT STAFF</p>
              <h2 className="text-editorial text-lg text-foreground">Selecionar profissional</h2>
              <p className="text-xs text-muted-foreground">Abrir fluxo Cliente ou Staff / Prof · categorias, métodos e jornada</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Prévia externa com dados demonstrativos. Reservas reais: aba Agenda.</p>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0 text-primary" />
          </button>
          {nutritionReview&&<p className="rounded-xl border border-primary/30 p-3 text-sm">Plano: {nutritionReview.dietName}. Escolha um nutricionista para discutir o ajuste; os registros seguem junto com o agendamento.</p>}
          {loading && <p className="text-[10px] text-muted-foreground">Carregando profissionais...</p>}
          {!loading && !directory.isError && visiblePros.length === 0 && (
            <div className="glass-mission rounded-xl p-6 text-center text-xs text-muted-foreground">
              {dietReview?"Nenhum nutricionista da equipe NINE disponível agora. Use o botão acima para solicitar um profissional da Staff.":"Nenhum profissional da equipe NINE disponível agora. Use o botão acima para solicitar um profissional da Staff."}
            </div>
          )}
          {visiblePros.map((p) => (
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
          {directory.isError && (
            <button onClick={() => void directory.refetch()} className="text-[11px] text-muted-foreground underline underline-offset-2">
              Não foi possível carregar a equipe NINE. Tentar novamente
            </button>
          )}
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
          <button onClick={() => openChat("team")} className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display uppercase">Chat com a equipe</p>
              <p className="text-[10px] text-muted-foreground">Atendimento humano da equipe 9FIT</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => openChat("ron")} className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display uppercase">Perguntar ao RON IA</p>
              <p className="text-[10px] text-muted-foreground">Assistente com voz · mesmo chat do botão flutuante</p>
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
                    onClick={() => bookService(s.key)}
                    className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/40 transition flex items-center gap-3 text-left"
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
