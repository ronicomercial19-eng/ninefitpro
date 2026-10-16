import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "unauthorized" }, 401);
  const { data: role } = await admin.rpc("get_user_role", { _user_id: auth.user.id });
  if (!['professor', 'trainer', 'admin', 'super_admin'].includes(role ?? '')) return json({ error: "professor_role_required" }, 403);

  const { data: recommendations, error } = await admin.from("training_adjustment_recommendations").select("id,athlete_id,week_start,status,recommendation_type,rationale,created_at,athletes!inner(name,coach_id),training_adjustment_feedback(accepted,rating,outcome,created_at),training_adjustment_deliveries(status,attempt_count,last_error)").order("created_at", { ascending: false }).limit(500);
  if (error) return json({ error: error.message }, 500);
  const visible = (recommendations ?? []).filter((r: any) => ['admin', 'super_admin'].includes(role ?? '') || r.athletes?.coach_id === auth.user.id);
  const summary = { total: visible.length, pending: 0, accepted: 0, applied: 0, rejected: 0, delivered: 0, failed_delivery: 0, feedback_count: 0, average_rating: null as number | null };
  const ratings: number[] = [];
  for (const row of visible as any[]) {
    if (row.status === 'pending') summary.pending++;
    if (row.status === 'accepted') summary.accepted++;
    if (row.status === 'applied') summary.applied++;
    if (row.status === 'rejected') summary.rejected++;
    const delivery = row.training_adjustment_deliveries?.[0];
    if (delivery?.status === 'success') summary.delivered++;
    if (delivery?.status === 'failed') summary.failed_delivery++;
    for (const feedback of row.training_adjustment_feedback ?? []) { summary.feedback_count++; if (Number.isFinite(feedback.rating)) ratings.push(Number(feedback.rating)); }
  }
  summary.average_rating = ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 100) / 100 : null;
  return json({ success: true, summary, recommendations: visible });
});
