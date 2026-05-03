import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook para registrar interações do aluno (cliques, dúvidas, treinos iniciados).
 * Alimenta a tabela user_interactions usada pela camada de aprendizado.
 */
export function useTrackInteraction() {
  const { user } = useAuth();

  return useCallback(
    async (type: string, payload: Record<string, any> = {}) => {
      if (!user) return;
      try {
        await (supabase as any)
          .from("user_interactions")
          .insert({ user_id: user.id, type, payload });
      } catch (e) {
        // silencioso — telemetria não pode quebrar a UI
        console.debug("[track]", type, e);
      }
    },
    [user]
  );
}
