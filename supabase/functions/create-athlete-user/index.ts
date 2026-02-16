import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check - require trainer role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const callerId = claimsData.claims.sub;
    const { data: roleCheck } = await authClient.from("user_roles").select("role").eq("user_id", callerId).single();
    if (!roleCheck || !["admin", "super_admin", "trainer"].includes(roleCheck.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { athleteId, email, password, name } = await req.json();

    if (!athleteId || !email || !password) {
      throw new Error("Missing required fields: athleteId, email, password");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error(`Invalid email format: "${email}". Please provide a valid email address.`);
    }

    console.log("Creating auth user for:", { athleteId, email: trimmedEmail, name });

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        athlete_id: athleteId,
        user_type: "athlete",
      },
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === trimmedEmail);
        
        if (existingUser) {
          await supabaseAdmin.from("athlete_auth_link").upsert({
            athlete_id: athleteId,
            user_id: existingUser.id,
          }, { onConflict: "athlete_id" });

          return new Response(
            JSON.stringify({ success: true, message: "User already exists, linked to athlete", userId: existingUser.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      throw createError;
    }

    if (!userData?.user) {
      throw new Error("Failed to create user");
    }

    const { error: linkError } = await supabaseAdmin.from("athlete_auth_link").insert({
      athlete_id: athleteId,
      user_id: userData.user.id,
    });

    if (linkError) {
      console.error("Error linking athlete:", linkError);
    }

    await supabaseAdmin.from("athletes").update({
      auto_password_temp: password,
      password_changed: false,
      activated: true,
      user_id: userData.user.id,
      metadata: { email: trimmedEmail }
    }).eq("id", athleteId);

    return new Response(
      JSON.stringify({ success: true, userId: userData.user.id, message: "User created successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
