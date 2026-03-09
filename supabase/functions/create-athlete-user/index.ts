import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Standardized API response */
function apiResponse(data: any, status = 200) {
  return new Response(JSON.stringify({
    success: status < 400,
    ...(status < 400 ? { data } : { error: data }),
    metadata: { timestamp: new Date().toISOString(), version: 'v1' }
  }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function apiError(code: string, message: string, status = 500) {
  return apiResponse({ code, message }, status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check - require trainer role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return apiError('UNAUTHORIZED', 'Missing authorization header', 401);

    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) return apiError('INVALID_TOKEN', 'Invalid authentication token', 401);

    const callerId = claimsData.claims.sub;
    const { data: roleCheck } = await authClient.from("user_roles").select("role").eq("user_id", callerId).single();
    if (!roleCheck || !["admin", "super_admin", "trainer"].includes(roleCheck.role)) {
      return apiError('INSUFFICIENT_PERMISSIONS', 'Trainer role required', 403);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { athleteId, email, password, name } = await req.json();

    if (!athleteId || !email || !password) {
      return apiError('MISSING_FIELDS', 'Missing required fields: athleteId, email, password', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!emailRegex.test(trimmedEmail)) {
      return apiError('INVALID_EMAIL', `Invalid email format: "${email}"`, 400);
    }

    console.log("Creating auth user for:", { athleteId, email: trimmedEmail, name });

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, athlete_id: athleteId, user_type: "athlete" },
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === trimmedEmail);
        
        if (existingUser) {
          await supabaseAdmin.from("athlete_auth_link").upsert(
            { athlete_id: athleteId, user_id: existingUser.id },
            { onConflict: "athlete_id" }
          );
          return apiResponse({ userId: existingUser.id, message: "User already exists, linked to athlete", linked: true });
        }
      }
      return apiError('CREATE_USER_ERROR', createError.message, 400);
    }

    if (!userData?.user) return apiError('CREATE_FAILED', 'Failed to create user', 500);

    const { error: linkError } = await supabaseAdmin.from("athlete_auth_link").insert({
      athlete_id: athleteId, user_id: userData.user.id,
    });
    if (linkError) console.error("Error linking athlete:", linkError);

    await supabaseAdmin.from("athletes").update({
      auto_password_temp: password, password_changed: false,
      activated: true, user_id: userData.user.id,
      metadata: { email: trimmedEmail }
    }).eq("id", athleteId);

    return apiResponse({ userId: userData.user.id, message: "User created successfully" });
  } catch (error: any) {
    console.error("Error:", error);
    return apiError('INTERNAL_ERROR', error.message, 400);
  }
});
