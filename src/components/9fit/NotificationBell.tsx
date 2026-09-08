import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, message, is_read, created_at, action_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data || []) as NotificationRow[]);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchNotifications]);

  const unreadCount = items.filter(i => !i.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i));
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setItems(prev => prev.map(i => ({ ...i, is_read: true })));
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) fetchNotifications(); }}>
      <PopoverTrigger asChild>
        <button className="relative w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <Bell className="w-4 h-4 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-card border-border max-h-[70vh] overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider">Notificações</p>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-[10px] text-primary uppercase tracking-wide">
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhuma notificação por aqui.</p>
          ) : items.map(n => (
            <button
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`w-full text-left px-3 py-3 border-b border-border/50 hover:bg-white/[0.02] transition ${!n.is_read ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{n.title}</p>
                  {n.message && <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>}
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
