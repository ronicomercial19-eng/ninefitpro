import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronRight, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

import { toast } from "sonner";
import { StudentSectionHeader } from "@/components/9fit/StudentSectionHeader";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
}

type Grouped = NotificationRow & { ids: string[] };

const JANELA_DUPLICADA_MS = 10 * 60 * 1000;
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** "Nova Periodização Atribuída" -> "Nova periodização atribuída". Só quando o título inteiro está em Title Case. */
function tituloEmFrase(titulo: string) {
  const palavras = titulo.trim().split(/\s+/);
  const emTitleCase = palavras.length > 1 && palavras.every(p => /^\p{Lu}[\p{Ll}]+$/u.test(p));
  return emTitleCase ? palavras.map((p, i) => (i === 0 ? p : p.toLowerCase())).join(" ") : titulo;
}

/**
 * O mesmo aviso pode chegar por dois caminhos (ex.: duas regras disparando para a mesma atribuição).
 * Mostra uma vez só: mesmo título (sem acento/caixa) criado em até 10 min. Guarda os ids para
 * marcar todos como lidos juntos. A lista chega do mais novo para o mais antigo.
 */
function agruparDuplicadas(rows: NotificationRow[]): Grouped[] {
  const out: Grouped[] = [];
  for (const row of rows) {
    const chave = normalizar(row.title);
    const existente = out.find(g => normalizar(g.title) === chave
      && Math.abs(new Date(g.created_at).getTime() - new Date(row.created_at).getTime()) <= JANELA_DUPLICADA_MS);
    if (existente) {
      existente.ids.push(row.id);
      existente.is_read = existente.is_read && row.is_read;
      if (!existente.action_url && row.action_url) existente.action_url = row.action_url;
      if (!existente.message && row.message) existente.message = row.message;
    } else out.push({ ...row, ids: [row.id] });
  }
  return out;
}

/** Centro de notificações do aluno. O sino do topo abre esta tela (antes caía no RON). */
export default function NineFitNotificacoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const owner = useRef(user?.id); owner.current = user?.id;
  const writing = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) { setItems([]); setLoading(false); return; }
    const uid = user.id;
    setLoading(true);
    setError(false);
    try {
      const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000));
      const query = supabase
        .from("notifications")
        .select("id, type, title, message, is_read, created_at, action_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .then((r) => r);
      const { data, error: err } = (await Promise.race([query, timeout])) as any;
      if (err) throw err;
      if (owner.current === uid) setItems((data || []) as NotificationRow[]);
    } catch (e) {
      console.error("notifications load failed", e);
      if (owner.current === uid) setError(true);
    } finally {
      if (owner.current === uid) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { setItems([]); void load(); }, [load]);

  const grouped = useMemo(() => agruparDuplicadas(items), [items]);
  const unread = grouped.filter((i) => !i.is_read).length;

  const markRead = async (ids?: string[]) => {
    if (!user || writing.current) return false;
    const uid = user.id; writing.current = true;
    try {
      let query = supabase.from("notifications").update({ is_read: true }).eq("user_id", uid);
      if (ids?.length) query = query.in("id", ids); else query = query.eq("is_read", false);
      const { data, error } = await query.select("id");
      if (error || (ids?.length && !data?.length)) throw error || new Error("not_updated");
      if (owner.current !== uid) return false;
      const updated = new Set((data || []).map(row => row.id));
      setItems(prev => prev.map(item => updated.has(item.id) ? { ...item, is_read: true } : item));
      return true;
    } catch { if (owner.current === uid) toast.error("Não foi possível marcar a leitura. Tente novamente."); return false; }
    finally { writing.current = false; }
  };
  const open = async (n: Grouped) => {
    if (!n.is_read && !await markRead(n.ids)) return;
    if (n.action_url?.startsWith("/9fit/") && !n.action_url.includes("\\")) navigate(n.action_url);
  };
  const markAll = () => { if(unread) void markRead(); };

  return (
    <div className="nine-brand min-h-screen gradient-mission pb-28">
      <StudentSectionHeader kicker="9FIT // ALERTAS" title="Notificações" description={unread > 0 ? `${unread} não lida(s)` : "Tudo em dia"} actions={unread > 0 ? <button type="button" onClick={markAll} className="flex items-center gap-1 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-primary"><CheckCheck className="h-3.5 w-3.5" /> Marcar todas</button> : undefined} />

      <div className="px-4 space-y-2">
        {loading && <p className="text-[10px] text-muted-foreground">Carregando notificações...</p>}
        {error && !loading && (
          <button onClick={() => void load()} className="text-[11px] text-muted-foreground underline underline-offset-2">
            Não foi possível carregar as notificações. Tentar novamente
          </button>
        )}
        {!loading && !error && grouped.length === 0 && (
          <div className="glass-mission rounded-xl p-8 text-center">
            <Bell className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma notificação por aqui.</p>
          </div>
        )}
        {grouped.map((n) => (
          <button
            key={n.id}
            onClick={() => void open(n)}
            className={`w-full glass-mission rounded-xl p-3 flex items-start gap-3 text-left transition hover:bg-primary/5 ${!n.is_read ? "border border-primary/30" : ""}`}
          >
            {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display text-foreground">{tituloEmFrase(n.title)}</p>
              {n.message && <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>}
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
            {n.action_url && n.action_url.startsWith("/") && <ChevronRight className="w-4 h-4 text-primary mt-1" />}
          </button>
        ))}
      </div>

      <BottomNavigation />
    </div>
  );
}
