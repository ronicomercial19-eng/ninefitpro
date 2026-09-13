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

const invokeZap = (action: string, options?: Parameters<typeof supabase.functions.invoke>[1]) =>
  supabase.functions.invoke(`zap-proxy?action=${action}`, options);

export function useZapThread(userId?: string, subject = "Atendimento FitPro") {
  return useQuery({
    queryKey: ["zap", "thread", userId],
    enabled: Boolean(userId),
    staleTime: Infinity,
    queryFn: async () => {
      const externalKey = `fitpro:user:${userId!}`;
      const existing = await invokeZap(`threads&external_key=${encodeURIComponent(externalKey)}`);
      if (existing.error) throw existing.error;
      const threads = (existing.data as { threads?: Array<{ id: string }> })?.threads ?? [];
      if (threads[0]?.id) return threads[0].id;

      const created = await invokeZap("threads.upsert", {
        method: "POST",
        body: { subject, external_key: externalKey, context: { user_id: userId }, participants: [] },
      });
      if (created.error) throw created.error;
      const id = (created.data as { thread?: { id?: string } })?.thread?.id;
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
          sender_type: "user",
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
