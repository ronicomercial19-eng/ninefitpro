import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StudentWelcomeRequest {
  studentName: string;
  studentEmail: string;
  password: string;
  coachName: string;
  objetivo: string;
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentName, studentEmail, password, coachName, objetivo, appUrl }: StudentWelcomeRequest = await req.json();

    if (!studentEmail || !studentName || !password) {
      throw new Error("Dados incompletos: nome, email e senha são obrigatórios");
    }

    const emailResponse = await resend.emails.send({
      from: "9FIT PRO <onboarding@resend.dev>",
      to: [studentEmail],
      subject: `Bem-vindo ao 9FIT PRO, ${studentName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo ao 9FIT PRO</title>
        </head>
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
              <p style="margin: 5px 0;"><strong>Senha:</strong> ${password}</p>
              <p style="margin: 5px 0;"><strong>Objetivo:</strong> ${objetivo || 'A definir'}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl || 'https://9c713e4a-7db8-48ba-829c-18abc2bf4a27.lovableproject.com/9fit/login'}" 
                 style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                🚀 Acessar o App
              </a>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>⚠️ Importante:</strong> Recomendamos que você altere sua senha no primeiro acesso para maior segurança.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              Qualquer dúvida, entre em contato com seu professor.<br>
              Bons treinos! 💪
            </p>
          </div>
          
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            © ${new Date().getFullYear()} 9FIT PRO - Sistema de Treinamento
          </p>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
