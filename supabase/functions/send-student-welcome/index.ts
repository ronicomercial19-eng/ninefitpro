import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth check - require trainer role
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return apiError('UNAUTHORIZED', 'Missing authorization', 401);

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsError || !claimsData?.claims) return apiError('INVALID_TOKEN', 'Invalid token', 401);

  const callerId = claimsData.claims.sub;
  const { data: roleCheck } = await authClient.from("user_roles").select("role").eq("user_id", callerId).single();
  if (!roleCheck || !["admin", "super_admin", "trainer"].includes(roleCheck.role)) {
    return apiError('INSUFFICIENT_PERMISSIONS', 'Trainer role required', 403);
  }

  try {
    const { studentName, studentEmail, password, coachName, objetivo, appUrl } = await req.json();

    if (!studentEmail || !studentName || !password) {
      return apiError('MISSING_FIELDS', 'Nome, email e senha são obrigatórios', 400);
    }

    const emailResponse = await resend.emails.send({
      from: "9FIT PRO <onboarding@resend.dev>",
      to: [studentEmail],
      subject: `Bem-vindo ao 9FIT PRO, ${studentName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Bem-vindo ao 9FIT PRO</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🏋️ 9FIT PRO</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Sistema de Treinamento Profissional</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #ea580c; margin-top: 0;">Olá, ${studentName}! 👋</h2>
            <p>Você foi cadastrado no sistema de treinamento pelo seu professor <strong>${coachName || 'seu treinador'}</strong>.</p>
            <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <h3 style="color: #ea580c; margin: 0 0 10px 0;">📋 Seus Dados de Acesso</h3>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${studentEmail}</p>
              <p style="margin: 5px 0;"><strong>Senha temporária:</strong> ${password}</p>
              <p style="margin: 5px 0;"><strong>Objetivo:</strong> ${objetivo || 'A definir'}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl || 'https://ninefitpro.lovable.app/9fit/login'}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">🚀 Acessar o App</a>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;"><strong>⚠️ Importante:</strong> Recomendamos que você altere sua senha no primeiro acesso para maior segurança.</p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; text-align: center;">Qualquer dúvida, entre em contato com seu professor.<br>Bons treinos! 💪</p>
          </div>
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} 9FIT PRO - Sistema de Treinamento</p>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);
    return apiResponse({ emailId: emailResponse?.data?.id, message: 'Email enviado com sucesso' });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return apiError('EMAIL_ERROR', error.message, 500);
  }
});
