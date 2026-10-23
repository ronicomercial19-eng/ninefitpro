import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronRight, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

import { toast } from "sonner";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
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

  const unread = items.filter((i) => !i.is_read).length;

  const markRead = async (id?: string) => {
    if (!user || writing.current) return false;
    const uid = user.id; writing.current = true;
    try {
      let query = supabase.from("notifications").update({ is_read: true }).eq("user_id", uid);
      if (id) query = query.eq("id", id); else query = query.eq("is_read", false);
      const { data, error } = await query.select("id");
      if (error || (id && !data?.length)) throw error || new Error("not_updated");
      if (owner.current !== uid) return false;
      const updated = new Set((data || []).map(row => row.id));
      setItems(prev => prev.map(item => updated.has(item.id) ? { ...item, is_read: true } : item));
      return true;
    } catch { if (owner.current === uid) toast.error("Não foi possível marcar a leitura. Tente novamente."); return false; }
    finally { writing.current = false; }
  };
  const open = async (n: NotificationRow) => {
    if (!n.is_read && !await markRead(n.id)) return;
    if (n.action_url?.startsWith("/9fit/") && !n.action_url.includes("\\")) navigate(n.action_url);
  };
  const markAll = () => { if(unread) void markRead(); };

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-16 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // ALERTAS</p>
        <h1 className="text-massive text-3xl text-foreground mt-1">NOTIFICAÇÕES</h1>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs font-data text-muted-foreground uppercase tracking-widest">
            {unread > 0 ? `${unread} não lida(s)` : "Tudo em dia"}
          </p>
          {unread > 0 && (
            <button onClick={markAll} className="flex items-center gap-1 text-[10px] text-primary uppercase tracking-widest">
              <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
            </button>
          )}
        </div>
      </div>

      <div className="px-4 space-y-2">
        {loading && <p className="text-[10px] text-muted-foreground">Carregando notificações...</p>}
        {error && !loading && (
          <button onClick={() => void load()} className="text-[11px] text-muted-foreground underline underline-offset-2">
            Não foi possível carregar as notificações. Tentar novamente
          </button>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="glass-mission rounded-xl p-8 text-center">
            <Bell className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma notificação por aqui.</p>
          </div>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => void open(n)}
            className={`w-full glass-mission rounded-xl p-3 flex items-start gap-3 text-left transition hover:bg-primary/5 ${!n.is_read ? "border border-primary/30" : ""}`}
          >
            {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display text-foreground">{n.title}</p>
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
