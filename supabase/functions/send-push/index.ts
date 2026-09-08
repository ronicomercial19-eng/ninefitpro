import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-dispatch-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey) {
    console.error("send-push: missing configuration");
    return json(503, { error: "push_not_configured" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
  const callerId = claims?.claims?.sub as string | undefined;
  if (claimsError || !callerId) return json(401, { error: "unauthorized" });

  try {
    const body = await req.json().catch(() => null);
    const notificationId = typeof body?.notification_id === "string" ? body.notification_id : null;
    if (!notificationId) return json(400, { error: "notification_id_required" });

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: notification, error: notificationError } = await admin
      .from("notifications")
      .select("id, user_id, title, message, action_url")
      .eq("id", notificationId)
      .single();
    if (notificationError || !notification) return json(404, { error: "notification_not_found" });

    const dispatchSecret = Deno.env.get("PUSH_DISPATCH_SECRET");
    const internalDispatch = Boolean(dispatchSecret)
      && req.headers.get("x-push-dispatch-secret") === dispatchSecret;

    if (!internalDispatch && notification.user_id !== callerId) {
      return json(403, { error: "forbidden" });
    }

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@9fit.app",
      publicKey,
      privateKey,
    );

    const { data: subscriptions, error: subscriptionsError } = await admin
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
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", subscription.id);
          removed += 1;
        } else {
          console.error("send-push: delivery failed", { notificationId, statusCode });
        }
      }
    }

    return json(200, { success: true, sent, removed });
  } catch (error) {
    console.error("send-push failed", error);
    return json(500, { error: "push_delivery_failed" });
  }
});
