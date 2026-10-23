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

// supabase.functions.invoke usa POST por padrão; o zap-proxy exige GET em
// action=threads e action=messages.list (senão responde 400 "unknown action").
const invokeZap = (action: string, options?: Parameters<typeof supabase.functions.invoke>[1]) =>
  supabase.functions.invoke(`zap-proxy?action=${action}`, { method: "GET", ...options });

export function useZapThread(userId?: string, subject = "Atendimento FitPro") {
  return useQuery({
    queryKey: ["zap", "thread", userId],
    enabled: Boolean(userId),
    staleTime: Infinity,
    retry: 2,
    retryDelay: 1200,
    queryFn: async () => {
      const externalKey = `fitpro:user:${userId!}`;
      // Contrato do Core: POST /threads abre OU reaproveita a conversa pelo
      // external_key (idempotente). Não existe GET /threads?external_key (dava 404).
      const created = await invokeZap("threads.upsert", {
        method: "POST",
        body: { subject, external_key: externalKey, context: { user_id: userId }, participants: [] },
      });
      if (created.error) throw created.error;
      const id = (created.data as { thread?: { id?: string }; id?: string })?.thread?.id || (created.data as { id?: string })?.id;
      if (!id) throw new Error("9ZAP não retornou o id da thread");
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
      const { data, error } = await invokeZap(`messages.list&thread_id=${encodeURIComponent(threadId!)}`);
      if (error) throw error;
      return ((data as { messages?: ZapMessage[] })?.messages ?? []);
    },
  });
}

export function useSendZap(threadId?: string, userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!threadId || !userId) throw new Error("Thread e usuário são obrigatórios");
      const { data, error } = await invokeZap("messages.send", {
        method: "POST",
        body: {
          thread_id: threadId,
          body,
          external_id: `fitpro:msg:${crypto.randomUUID()}`,
          // O Core 9ZAP aceita os papéis do contrato de integração:
          // student | trainer. "user" causa 400 no envio.
          sender_type: "student",
          sender_external_id: `fitpro:user:${userId}`,
          attachments: [],
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["zap", "messages", threadId] }),
  });
}
