/**
 * Intelligence Hub Service
 * Espelha eventos locais para o Banco Supra central (fire-and-forget).
 * Nunca lança exceção: falhas no Hub não devem afetar a UX local.
 */
import { supabase } from "@/integrations/supabase/client";

export interface MirrorEventInput {
  event_type: string;
  payload?: Record<string, unknown>;
  aluno_id?: string | null;
  aluno_email?: string | null;
}

export async function mirrorEvent(
  event_type: string,
  payload: Record<string, unknown> = {},
  aluno_id?: string | null,
  aluno_email?: string | null,
): Promise<void> {
  try {
    await supabase.functions.invoke("intelligence-hub-sync", {
      body: {
        event_type,
        payload,
        aluno_id: aluno_id ?? null,
        aluno_email: aluno_email ?? null,
        occurred_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    // silencioso por design
    console.debug("[IntelligenceHub] mirror falhou:", err);
  }
}
