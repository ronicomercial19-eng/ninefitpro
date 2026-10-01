import { supabase } from "@/integrations/supabase/client";
export async function requestRonChat(message: string, history: Array<{role: string; content: string}>) {
  const {data,error} = await supabase.functions.invoke("ai-coach",{body:{mode:"chat",message,history:history.slice(-20)}});
  if (error) {
    const details = await error.context?.json?.().catch(()=>null);
    throw new Error(details?.error?.message || "RON indisponível agora. Tente novamente em instantes.");
  }
  const reply = data?.data ?? data;
  if(data?.success === false || typeof reply?.content !== "string" || !reply.content.trim()) throw new Error("O RON não retornou uma resposta válida. Tente novamente.");
  return {content:reply.content,actions:Array.isArray(reply.actions) ? reply.actions : []};
}
