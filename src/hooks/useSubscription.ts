import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionPlan = {
  id: string;
  name: string;
  tagline: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  features: any;
};

export type Subscription = {
  id: string;
  plan_id: string | null;
  status: string;
  activated_at: string;
  expires_at: string | null;
  amount: number | null;
  source: string | null;
};

type Status = "loading" | "ready" | "error";

/** Assinatura real do usuário (user_subscriptions + subscription_plans). */
export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let alive = true;

    (async () => {
      setStatus("loading");
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          if (!alive) return;
          setSubscription(null);
          setPlan(null);
          setStatus("ready");
          return;
        }

        const { data: sub, error } = await supabase
          .from("user_subscriptions")
          .select("id,plan_id,status,activated_at,expires_at,amount,source")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("activated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!alive) return;
        setSubscription((sub as Subscription) ?? null);

        if (sub?.plan_id) {
          const { data: planRow, error: planErr } = await supabase
            .from("subscription_plans")
            .select("id,name,tagline,price_monthly,price_yearly,features")
            .eq("id", sub.plan_id)
            .maybeSingle();
          if (planErr) throw planErr;
          if (!alive) return;
          setPlan((planRow as SubscriptionPlan) ?? null);
        } else {
          setPlan(null);
        }

        setStatus("ready");
      } catch (e) {
        console.error("[useSubscription]", e);
        if (!alive) return;
        setStatus("error");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const isActive =
    !!subscription &&
    subscription.status === "active" &&
    (!subscription.expires_at || new Date(subscription.expires_at).getTime() > Date.now());

  return { subscription, plan, status, isActive };
}
