import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ZapMessage = {
  id: string;
  thread_id: string;
  sender_type: "user" | "agent" | "operator" | string;
  body: string;
  created_at: string;
  external_id?: string | null;
};

// O zap-proxy resolve thread, telefone e papel do remetente NO SERVIDOR a partir do login.
// O navegador não envia thread_id: `threadId` aqui só serve para ligar/desligar as consultas.
const invokeZap = (action: string, options?: Parameters<typeof supabase.functions.invoke>[1]) =>
  supabase.functions.invoke(`zap-proxy?action=${action}`, { method: "GET", ...options });

export function useZapThread(userId?: string, _subject = "Atendimento FitPro") {
  return useQuery({
    queryKey: ["zap", "thread", userId],
    enabled: Boolean(userId),
    staleTime: Infinity,
    retry: 2,
    retryDelay: 1200,
    queryFn: async () => {
      const { data, error } = await invokeZap("thread.ensure", { method: "POST" });
      if (error) throw error;
      const id = (data as { thread_id?: string })?.thread_id;
      if (!id) throw new Error("9ZAP não retornou a conversa");
      return id;
    },
  });
}

export function useZapMessages(threadId?: string) {
  return useQuery({
    queryKey: ["zap", "messages", threadId],
    enabled: Boolean(threadId),
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await invokeZap("messages.list");
      if (error) throw error;
      return ((data as { messages?: ZapMessage[] })?.messages ?? []);
    },
  });
}

export function useSendZap(threadId?: string, userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!threadId || !userId) throw new Error("Conversa e usuário são obrigatórios");
      const { data, error } = await invokeZap("messages.send", {
        method: "POST",
        body: { body, external_id: `fitpro:msg:${crypto.randomUUID()}` },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["zap", "messages", threadId] }),
  });
}
