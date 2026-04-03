import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = String(studentEmail).trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 255) {
      return apiError('INVALID_EMAIL', 'Formato de email inválido', 400);
    }

    // Validate name
    const safeName = String(studentName).trim().slice(0, 100);
    if (safeName.length < 2) {
      return apiError('INVALID_NAME', 'Nome deve ter pelo menos 2 caracteres', 400);
    }

    // Sanitize all user inputs for HTML email
    const safeNameHtml = escapeHtml(safeName);
    const safeEmailHtml = escapeHtml(trimmedEmail);
    const safeCoachName = escapeHtml(String(coachName || 'seu treinador').slice(0, 100));
    const safeObjetivo = escapeHtml(String(objetivo || 'A definir').slice(0, 200));
    const safePassword = escapeHtml(String(password).slice(0, 72));

    // Validate appUrl - only allow known domains
    const allowedUrlPatterns = [
      /^https:\/\/ninefitpro\.lovable\.app/,
      /^https:\/\/[a-z0-9-]+\.lovable\.app/,
      /^http:\/\/localhost:\d+/,
    ];
    const safeAppUrl = appUrl && allowedUrlPatterns.some(p => p.test(String(appUrl)))
      ? String(appUrl)
      : 'https://ninefitpro.lovable.app/9fit/login';

    const emailResponse = await resend.emails.send({
      from: "9FIT PRO <onboarding@resend.dev>",
      to: [trimmedEmail],
      subject: `Bem-vindo ao 9FIT PRO, ${safeName}!`,
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
            <h2 style="color: #ea580c; margin-top: 0;">Olá, ${safeNameHtml}! 👋</h2>
            <p>Você foi cadastrado no sistema de treinamento pelo seu professor <strong>${safeCoachName}</strong>.</p>
            <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <h3 style="color: #ea580c; margin: 0 0 10px 0;">📋 Seus Dados de Acesso</h3>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${safeEmailHtml}</p>
              <p style="margin: 5px 0;"><strong>Senha temporária:</strong> ${safePassword}</p>
              <p style="margin: 5px 0;"><strong>Objetivo:</strong> ${safeObjetivo}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${safeAppUrl}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">🚀 Acessar o App</a>
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

    console.log("Email sent successfully:", emailResponse?.data?.id);
    return apiResponse({ emailId: emailResponse?.data?.id, message: 'Email enviado com sucesso' });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return apiError('EMAIL_ERROR', 'Erro ao enviar email', 500);
  }
});
