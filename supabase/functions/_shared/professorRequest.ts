import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};
export const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
export async function professionalClient(req: Request) {
  const token = req.headers.get("Authorization");
  if (!token?.startsWith("Bearer ")) throw new Error("unauthorized");
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: token } } },
  );
  const { data, error } = await db.auth.getUser(token.slice(7));
  if (error || !data.user) throw new Error("unauthorized");
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role,is_active")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (
    data.user.is_anonymous ||
    profileError ||
    !profile ||
    profile.is_active === false ||
    !["professor", "trainer", "admin", "super_admin"].includes(profile.role)
  )
    throw new Error("professional_required");
  return db;
}
export function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return json(
    { success: false, error: message },
    message === "unauthorized"
      ? 401
      : message === "professional_required"
        ? 403
        : 409,
  );
}
