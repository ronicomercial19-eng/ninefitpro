import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = String(email).trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 255) {
      return apiError('INVALID_EMAIL', 'Invalid email format', 400);
    }

    // Validate name
    const safeName = name ? String(name).trim().slice(0, 100) : undefined;
    if (safeName !== undefined && safeName.length < 2) {
      return apiError('INVALID_NAME', 'Name must be at least 2 characters', 400);
    }

    // Validate password length
    const safePassword = String(password);
    if (safePassword.length < 8 || safePassword.length > 72) {
      return apiError('INVALID_PASSWORD', 'Password must be between 8 and 72 characters', 400);
    }

    // Validate athleteId is UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(String(athleteId))) {
      return apiError('INVALID_ATHLETE_ID', 'Invalid athlete ID format', 400);
    }

    console.log("Creating auth user for athlete:", athleteId);

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password: safePassword,
      email_confirm: true,
      user_metadata: { full_name: safeName, athlete_id: athleteId, user_type: "athlete" },
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
      return apiError('CREATE_USER_ERROR', 'Failed to create user account', 400);
    }

    if (!userData?.user) return apiError('CREATE_FAILED', 'Failed to create user', 500);

    const { error: linkError } = await supabaseAdmin.from("athlete_auth_link").insert({
      athlete_id: athleteId, user_id: userData.user.id,
    });
    if (linkError) console.error("Error linking athlete:", linkError);

    await supabaseAdmin.from("athletes").update({
      password_changed: false,
      activated: true, user_id: userData.user.id,
      metadata: { email: trimmedEmail }
    }).eq("id", athleteId);

    return apiResponse({ userId: userData.user.id, message: "User created successfully" });
  } catch (error: any) {
    console.error("Error:", error);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
});
