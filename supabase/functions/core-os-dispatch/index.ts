import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { createCoreIntegration } from "../_shared/coreIntegration.ts";
const url = Deno.env.get("SUPABASE_URL")!;
const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
Deno.serve(createCoreIntegration({ db, env: name => Deno.env.get(name), currentUser: async authorization => {
  if (!authorization.startsWith("Bearer ")) return null;
  const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const r = await client.auth.getUser();
  return !r.error && !r.data.user?.is_anonymous ? r.data.user?.id ?? null : null;
} }));
