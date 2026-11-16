import { useState } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Users, Calendar, MessageSquare, ChevronRight, Briefcase, Stethoscope, Apple, RefreshCw } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useStaffDirectory } from "@/hooks/useStaffDirectory";
import { AppSupport } from "@/components/9fit/AppSupport";
import { useStaffProfessionals } from "@/hooks/useStaffProfessionals";
import { StaffBookingStatus } from "@/components/9fit/StaffBookingStatus";
import { StudentSectionHeader } from "@/components/9fit/StudentSectionHeader";

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

// Métodos do contêiner Staff (mesmos ids que a API já recebe em useStaffProfessionals).
const STAFF_METHODS: { id: string; label: string }[] = [
  { id: "strength", label: "Treino e força" },
  { id: "mobility", label: "Mobilidade" },
  { id: "recovery", label: "Recuperação" },
  { id: "running", label: "Corrida" },
  { id: "rehab", label: "Reabilitação" },
];

// Contas de demonstração não devem aparecer para o aluno final.
const isDemoPro = (p: Pro) => /demo/i.test(p.full_name || "");

const initials = (name: string) =>
  (name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

function SectionTitle({ kicker, title, aside }: { kicker: string; title: string; aside?: string }) {
  return (
    <div className="flex items-end justify-between mb-2 px-1">
      <div>
        <p className="text-[9px] font-data tracking-[0.3em] text-primary/80">{kicker}</p>
        <h2 className="text-editorial text-base text-foreground">{title}</h2>
      </div>
      {aside && <span className="text-[10px] font-data tracking-widest text-muted-foreground uppercase">{aside}</span>}
    </div>
  );
}

export default function NineFitStaff() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const nutritionReview = (location.state as any)?.nutritionReview;
  const dietReview = searchParams.get("context") == "diet_review";
  const [tab, setTab] = useState<"team" | "support" | "schedule">("team");
  const directory = useStaffDirectory();
  const [staffMethod, setStaffMethod] = useState("strength");
  const staffProfessionals = useStaffProfessionals(staffMethod);
  const loading = directory.isPending;
  const [selected, setSelected] = useState<Pro | null>(null);

  // Equipe NINE: sem contas demo e sem duplicados.
  const seen = new Set<string>();
  const pros = (directory.data || []).filter((p: Pro) => {
    if (isDemoPro(p) || seen.has(p.user_id)) return false;
    seen.add(p.user_id);
    return true;
  });
  const visiblePros = dietReview ? pros.filter((p) => p.role === "nutritionist") : pros;
  const services = selected ? (SERVICES_BY_ROLE[selected.role] || SERVICES_BY_ROLE.default) : [];

  const bookService = (svcKey: string) => {
    if (!selected) return;
    const service = svcKey === "avaliacao" ? "avaliacao_fisica" : svcKey === "plano" ? "consultoria" : svcKey;
    navigate(
      `/9fit/aulas-creditos?teacher_id=${encodeURIComponent(selected.user_id)}&service=${encodeURIComponent(service)}&tab=schedule`,
      { state: { nutritionReview } },
    );
    setSelected(null);
  };

  const staffList = staffProfessionals.data || [];

  return (
    <div className="fitpro-orange min-h-screen gradient-mission pb-28">
      <StudentSectionHeader
        kicker="9FIT // EQUIPE"
        title={dietReview ? "Revisão nutricional" : "Suporte e equipe"}
        description="Equipe, serviços e agendamento em um só lugar."
      />

      {/* Abas primeiro: a página tem uma hierarquia só. */}
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

      {tab === "team" && (
        <div className="px-4 space-y-6">
          {nutritionReview && (
            <p className="rounded-xl border border-primary/30 p-3 text-sm">
              Plano: {nutritionReview.dietName}. Escolha um nutricionista para discutir o ajuste; os registros seguem junto com o agendamento.
            </p>
          )}

          {/* 1. Contêiner real da API Staff */}
          <section aria-label="Profissionais Staff">
            <SectionTitle
              kicker="9FIT STAFF"
              title="Profissionais Staff"
              aside={staffProfessionals.isPending ? "consultando" : `${staffList.length} ativo(s)`}
            />
            <div className="glass-mission glass-mission-active rounded-2xl p-4 space-y-3">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Serviço Staff">
                {STAFF_METHODS.map((m) => (
                  <button
                    key={m.id}
                    role="tab"
                    aria-selected={staffMethod === m.id}
                    onClick={() => setStaffMethod(m.id)}
                    className={`shrink-0 min-h-9 rounded-full px-3 text-[10px] font-display uppercase tracking-widest transition-all ${
                      staffMethod === m.id
                        ? "bg-primary text-primary-foreground"
                        : "border border-primary/25 text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {staffProfessionals.isPending ? (
                <p role="status" className="text-xs text-muted-foreground">Consultando equipe Staff…</p>
              ) : staffProfessionals.isError ? (
                <button
                  className="min-h-11 flex items-center gap-2 text-xs text-primary"
                  onClick={() => void staffProfessionals.refetch()}
                >
                  <RefreshCw className="w-4 h-4" /> Não foi possível consultar a Staff. Tentar novamente
                </button>
              ) : !staffList.length ? (
                <p className="text-xs text-muted-foreground">Nenhum profissional ativo para este serviço no momento.</p>
              ) : (
                <div className="space-y-2">
                  {staffList.map((pro: any) => (
                    <button
                      key={pro.id}
                      className="w-full rounded-xl border border-primary/20 bg-black/20 p-3 flex items-center gap-3 text-left"
                      onClick={() =>
                        navigate(
                          `/9fit/aulas-creditos?tab=schedule&staff_professional_id=${encodeURIComponent(pro.id)}&staff_method_id=${encodeURIComponent(staffMethod)}`,
                        )
                      }
                    >
                      <div className="w-11 h-11 shrink-0 rounded-full bg-primary/15 grid place-items-center text-sm font-display text-primary">
                        {initials(pro.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-display uppercase text-foreground truncate">{pro.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {pro.role} · {pro.location || "Local a combinar"}
                        </p>
                        <p className="mt-1 text-[10px] text-primary">Solicitar reserva →</p>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0 text-primary" />
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate("/9fit/native-system?app=staff")}
                className="w-full min-h-11 rounded-xl border border-primary/30 text-[11px] font-display uppercase tracking-widest text-primary flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Abrir fluxo 9FIT Staff: Cliente ou Staff / Prof"
              >
                <Briefcase className="w-4 h-4" /> Abrir fluxo Staff completo
              </button>
            </div>
          </section>

          {/* 2. Reservas Staff do aluno */}
          <section aria-label="Reservas Staff">
            <StaffBookingStatus />
          </section>

          {/* 3. Equipe NINE (profissionais internos) */}
          <section aria-label="Equipe NINE">
            <SectionTitle
              kicker="EQUIPE NINE"
              title="Falar com a equipe"
              aside={loading ? "carregando" : `${visiblePros.length} disponível(is)`}
            />
            <div className="space-y-2">
              {loading && <p className="text-[10px] text-muted-foreground px-1">Carregando profissionais...</p>}
              {!loading && !directory.isError && visiblePros.length === 0 && (
                <div className="glass-mission rounded-xl p-6 text-center text-xs text-muted-foreground">
                  {dietReview
                    ? "Nenhum nutricionista da equipe NINE disponível agora. Use os profissionais Staff acima."
                    : "Nenhum profissional da equipe NINE disponível agora. Use os profissionais Staff acima."}
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
                      initials(p.full_name)
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
                <button
                  onClick={() => void directory.refetch()}
                  className="text-[11px] text-muted-foreground underline underline-offset-2"
                >
                  Não foi possível carregar a equipe NINE. Tentar novamente
                </button>
              )}
            </div>
          </section>
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
          <AppSupport />
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
