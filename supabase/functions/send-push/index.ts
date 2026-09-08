import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey) {
      throw new Error("Missing push notification secrets");
    }

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@9fit.app",
      publicKey,
      privateKey,
    );

    const body = await req.json();
    const notificationId = body?.notification_id;
    if (!notificationId) throw new Error("notification_id is required");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, action_url")
      .eq("id", notificationId)
      .single();

    if (notificationError) throw notificationError;

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("user_id", notification.user_id);

    if (subscriptionsError) throw subscriptionsError;

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message ?? "",
      url: notification.action_url ?? "/",
      notification_id: notification.id,
    });

    let sent = 0;
    let removed = 0;
    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
        }, payload);
        sent++;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          removed++;
        } else {
          console.error("Push delivery failed", error);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent, removed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-push failed", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
