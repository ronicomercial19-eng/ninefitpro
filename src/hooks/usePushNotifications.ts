import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { withTimeout } from '@/lib/withTimeout';

// Chave pública VAPID do 9FIT (a privada fica só no edge function send-push)
const VAPID_PUBLIC_KEY = "BOdSB4k3SK8y9ihm24cFJ5CLk0dwHay-C02DbjvSLh875bNezXi1N13mT_R8a_SOW_ezD1QS6aIKIDGoddkk5Cc";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [supported] = useState(() => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const owner = useRef(user?.id);
  owner.current = user?.id;

  const checkSubscription = useCallback(async () => {
    const expected = user?.id;
    setSubscribed(false);
    if (!supported || !expected) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return;
      const { data, error } = await withTimeout(supabase.from('push_subscriptions').select('endpoint').eq('user_id',expected).eq('endpoint',sub.endpoint).maybeSingle());
      if (owner.current === expected) setSubscribed(!error && !!data);
    } catch { if(owner.current === expected) setSubscribed(false); }
  }, [supported, user?.id]);

  useEffect(() => { checkSubscription(); }, [checkSubscription]);

  const subscribe = async () => {
    if (!supported) {
      toast.error("Seu navegador não suporta notificações push");
      return;
    }
    if (!user) {
      toast.error("Faça login para ativar notificações");
      return;
    }

    setLoading(true);
    const expected = user.id;
    try {
      const permission = await Notification.requestPermission();
      if(owner.current !== expected) return;
      if (permission !== "granted") {
        toast.error("Permissão de notificação negada");
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if(sub) {
        const {data,error} = await withTimeout(supabase.from('push_subscriptions').select('endpoint').eq('user_id',expected).eq('endpoint',sub.endpoint).maybeSingle());
        if(error) throw error;
        if(!data) { await sub.unsubscribe(); sub = null; }
      }
      if(owner.current !== expected) return;
      sub = sub || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const subJson = sub.toJSON() as any;

      if(owner.current !== expected) return;
      const { error } = await withTimeout(supabase.from("push_subscriptions" as any).upsert({
        user_id: expected,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      }, { onConflict: "endpoint" }));

      if (error) throw error;

      if(owner.current === expected) { setSubscribed(true); toast.success("Notificações ativadas!"); }
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao ativar notificações: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    const expected = user?.id;
    if(!expected) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const {data,error} = await withTimeout(supabase.from('push_subscriptions').delete().eq('user_id',expected).eq('endpoint',sub.endpoint).select('endpoint'));
        if(error) throw error;
        if(!data?.length || owner.current !== expected) throw new Error('Este dispositivo não está vinculado à conta atual.');
        await sub.unsubscribe();
      }
      if(owner.current === expected) { setSubscribed(false); toast.success("Notificações desativadas"); }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return { supported, subscribed, loading, subscribe, unsubscribe };
}
