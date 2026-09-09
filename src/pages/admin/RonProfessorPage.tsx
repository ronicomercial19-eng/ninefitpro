import { useEffect, useRef, useState } from "react";
import { Bot, Send, Search, Activity, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AthleteRow {
  id: string;
  name: string;
  user_id: string | null;
  sync_score: number | null;
  level: number | null;
  total_xp: number | null;
  preferred_goal: string | null;
}

interface ChatMsg { role: "user" | "assistant"; content: string }

// FIX (QA Fase D): /app/ron (painel do professor) renderizava o MESMO
// componente NineFitRon do aluno — visão invertida (o professor via a
// conversa do aluno com o próprio RON, sem seletor nem prescrição).
// Este componente substitui isso por um cockpit real: seletor de aluno,
// dossiê biológico com dado do banco, chat de prescrição usando o mesmo
// motor ai-coach (modes analyze_progress/recommendations/chat) já
// existente e funcional, com contexto real via buildAthleteRichContext.
export default function RonProfessorPage() {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AthleteRow | null>(null);
  const [dossier, setDossier] = useState<{ workouts: number; completed: number; lastAssessment: string | null }>({ workouts: 0, completed: 0, lastAssessment: null });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("athletes" as any)
        .select("id, name, user_id, sync_score, level, total_xp, preferred_goal")
        .eq("coach_id", user?.id)
        .eq("is_test_account", false)
        .order("name");
      setAthletes((data as any) || []);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!selected) return;
    setMessages([]);
    setLoadingDossier(true);
    (async () => {
      const { data: workouts } = await supabase
        .from("workout_executions" as any)
        .select("status")
        .eq("athlete_id", selected.id)
        .order("workout_date", { ascending: false })
        .limit(10);
      const { data: assess } = await supabase
        .from("avaliacoes_unificadas" as any)
        .select("data_avaliacao")
        .eq("athlete_id", selected.id)
        .order("data_avaliacao", { ascending: false })
        .limit(1);
      setDossier({
        workouts: workouts?.length ?? 0,
        completed: workouts?.filter((w: any) => w.status === "completed").length ?? 0,
        lastAssessment: assess?.[0]?.data_avaliacao ?? null,
      });
      setLoadingDossier(false);
    })();
  }, [selected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const callCoach = async (mode: string, extra: Record<string, any> = {}, historyMsgs?: ChatMsg[]) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const res = await fetch("https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/ai-coach", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, ...extra, messages: historyMsgs?.map((m) => ({ role: m.role, content: m.content })) }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || "Erro na IA");
    return json.data.content as string;
  };

  const sendMessage = async (text: string) => {
    if (!selected || !text.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const content = await callCoach("chat", { userId: selected.user_id }, next);
      setMessages((m) => [...m, { role: "assistant", content }]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao consultar o RON");
    } finally {
      setLoading(false);
    }
  };

  const runQuickAction = async (kind: "analyze" | "recommend" | "periodize") => {
    if (!selected || loading) return;
    setLoading(true);
    const label = kind === "analyze" ? "Analisar Carga de Treino" : kind === "recommend" ? "Gerar Recomendações" : "Sugerir Ajuste de Periodização";
    setMessages((m) => [...m, { role: "user", content: label }]);
    try {
      const mode = kind === "recommend" ? "recommendations" : "analyze_progress";
      const content = await callCoach(mode, {
        data: { athleteId: selected.id, name: selected.name, goal: selected.preferred_goal },
      });
      setMessages((m) => [...m, { role: "assistant", content }]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao consultar o RON");
    } finally {
      setLoading(false);
    }
  };

  const filtered = athletes.filter((a) => a.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 h-[calc(100vh-140px)]">
      {/* Coluna 1: seletor de aluno */}
      <Card className="flex flex-col overflow-hidden">
        <CardContent className="p-3 flex flex-col h-full">
          <p className="text-xs font-display uppercase tracking-widest text-muted-foreground mb-2">Analisando</p>
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selected?.id === a.id ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted/50"}`}
                >
                  {a.name}
                </button>
              ))}
              {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum aluno encontrado.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Coluna 2: chat de prescrição */}
      <Card className="flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-primary" />
            <div>
              <p className="font-display uppercase text-sm leading-none">RON · Cockpit do Professor</p>
              <p className="text-xs text-muted-foreground">{selected ? `Prescrevendo para ${selected.name}` : "Selecione um aluno para começar"}</p>
            </div>
          </div>

          {selected && (
            <div className="flex gap-2 mb-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => runQuickAction("analyze")} disabled={loading}>
                <Activity className="w-3.5 h-3.5 mr-1.5" /> Analisar Carga
              </Button>
              <Button size="sm" variant="outline" onClick={() => runQuickAction("recommend")} disabled={loading}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Gerar Recomendações
              </Button>
              <Button size="sm" variant="outline" onClick={() => sendMessage(`Sugira um ajuste de periodização para ${selected.name} considerando o objetivo ${selected.preferred_goal || "não informado"} e o sync score atual.`)} disabled={loading}>
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Ajustar Periodização
              </Button>
            </div>
          )}

          <ScrollArea className="flex-1 pr-2" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.length === 0 && selected && (
                <p className="text-sm text-muted-foreground">
                  Peça algo como: "Ajuste o treino do {selected.name.split(" ")[0]} pra foco em hipertrofia" ou use os atalhos acima.
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    dangerouslySetInnerHTML={m.role === "assistant" ? { __html: m.content } : undefined}
                  >
                    {m.role === "user" ? m.content : undefined}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> RON está analisando...
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 mt-3">
            <Input
              placeholder={selected ? "Digite um comando de prescrição..." : "Selecione um aluno primeiro"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              disabled={!selected || loading}
            />
            <Button size="icon" onClick={() => sendMessage(input)} disabled={!selected || loading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coluna 3: dossiê biológico */}
      <Card className="flex flex-col overflow-hidden">
        <CardContent className="p-4">
          <p className="text-xs font-display uppercase tracking-widest text-muted-foreground mb-3">Dossiê Biológico</p>
          {!selected ? (
            <p className="text-sm text-muted-foreground">Selecione um aluno para ver os dados.</p>
          ) : loadingDossier ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-display">{selected.sync_score ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Sync Score</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-sm font-semibold">{selected.level ?? 1}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Nível</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-sm font-semibold">{selected.total_xp ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">XP</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Aderência (últimos registros)</p>
                <p className="text-sm font-semibold">{dossier.completed}/{dossier.workouts} concluídos</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Última avaliação</p>
                <p className="text-sm font-semibold">{dossier.lastAssessment ? new Date(dossier.lastAssessment).toLocaleDateString("pt-BR") : "Nenhuma registrada"}</p>
              </div>
              {selected.preferred_goal && (
                <Badge variant="outline" className="text-xs">{selected.preferred_goal}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
