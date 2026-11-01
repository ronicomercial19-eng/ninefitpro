import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/functionError";
export async function professorAI(
  athleteId: string,
  mode: string,
  message?: string,
  history: Array<{ role: string; content: string }> = [],
) {
  const { data, error } = await supabase.functions.invoke("ai-coach", {
    body: {
      audience: "professional",
      athlete_id: athleteId,
      mode,
      message,
      history,
      data: { athleteId },
    },
  });
  if (error) {
    const details = await error.context?.json?.().catch(() => null);
    throw new Error(
      functionErrorMessage(details, "Não foi possível consultar a IA. Tente novamente."),
    );
  }
  if (data?.success !== true || !data.data)
    throw new Error(functionErrorMessage(data, "Resposta da IA não confirmada."));
  return data.data as {
    content: string;
    recommendations?: any[];
    draft?: { title: string; exercises: any[] };
  };
}
