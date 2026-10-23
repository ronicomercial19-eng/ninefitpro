import { useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
type Notification = {
  id: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
};
export function NotificationBell() {
  const { user } = useAuth(),
    navigate = useNavigate(),
    qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const writing = useRef(false),
    owner = useRef(user?.id);
  owner.current = user?.id;
  const {
    supported,
    subscribed,
    loading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  const query = useQuery({
    queryKey: ["notifications-bell", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,message,is_read,created_at,action_url")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Notification[];
    },
  });
  useEffect(() => {
    setOpen(false);
  }, [user?.id]);
  const items = query.data ?? [],
    unread = items.filter((n) => !n.is_read).length;
  async function read(notification?: Notification) {
    if (!user || writing.current) return;
    const uid = user.id;
    writing.current = true;
    try {
      if (!notification?.is_read) {
        let update = supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", uid);
        update = notification
          ? update.eq("id", notification.id)
          : update.eq("is_read", false);
        const { data, error } = await update.select("id");
        if (error || (notification && !data?.length))
          throw error || new Error("Leitura não confirmada");
        await qc.invalidateQueries({ queryKey: ["notifications-bell", uid] });
      }
      if (owner.current !== uid) return;
      if (
        notification?.action_url &&
        /^\/(?:app|9fit)(?:\/|[?#]|$)/.test(notification.action_url) &&
        !notification.action_url.includes("\\")
      ) {
        navigate(notification.action_url);
        setOpen(false);
      }
    } catch {
      if (owner.current === uid)
        toast.error("Não foi possível confirmar a leitura. Tente novamente.");
    } finally {
      writing.current = false;
    }
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notificações${unread ? `: ${unread} não lidas` : ""}`}
          className="relative rounded-lg p-2"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <strong className="text-sm">Notificações</strong>
          <button
            disabled={!unread}
            className="text-xs text-primary"
            onClick={() => void read()}
          >
            Marcar todas
          </button>
        </div>
        <div className="max-h-80 overflow-auto">
          {query.isError ? (
            <p role="alert" className="p-4 text-sm">
              Falha ao carregar.{" "}
              <button onClick={() => void query.refetch()}>
                Tentar novamente
              </button>
            </p>
          ) : query.isLoading ? (
            <p className="p-4 text-sm">Carregando…</p>
          ) : !items.length ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhuma notificação.
            </p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                className={`w-full border-b p-3 text-left ${n.is_read ? "" : "bg-primary/5"}`}
                onClick={() => void read(n)}
              >
                <strong className="text-sm">{n.title}</strong>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </p>
              </button>
            ))
          )}
        </div>
        {supported && (
          <button
            disabled={pushLoading}
            className="w-full border-t p-3 text-xs text-primary"
            onClick={() => void (subscribed ? unsubscribe() : subscribe())}
          >
            {subscribed
              ? "Desativar notificações neste dispositivo"
              : "Ativar notificações neste dispositivo"}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
