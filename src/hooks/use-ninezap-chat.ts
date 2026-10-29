import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from '@/lib/withTimeout';
import { useRef } from "react";

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
const invokeZap = async (action: string, options?: Parameters<typeof supabase.functions.invoke>[1]) => {
  const result = await supabase.functions.invoke(`zap-proxy?action=${action}`, { method: "GET", ...options });
  if (result.error) {
    const response = (result.error as any).context;
    if (response instanceof Response) {
      const payload = await response.clone().json().catch(() => null);
      if (payload?.error === 'profile_phone_required') throw new Error('profile_phone_required');
    }
  }
  return result;
};

export function useZapThread(userId?: string, _subject = "Atendimento FitPro") {
  return useQuery({
    queryKey: ["zap", "thread", userId],
    enabled: Boolean(userId),
    staleTime: Infinity,
    retry: false,
    retryDelay: 1200,
    queryFn: async () => {
      const { data, error } = await withTimeout(invokeZap("thread.ensure", { method: "POST" }));
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
    retry: false,
    refetchInterval: query => query.state.status === "error" ? false : 2_500,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await withTimeout(invokeZap("messages.list"));
      if (error) throw error;
      return ((data as { messages?: ZapMessage[] })?.messages ?? []);
    },
  });
}

export function useSendZap(threadId?: string, userId?: string) {
  const queryClient = useQueryClient();
  const pending = useRef<{ userId:string; body:string; externalId:string } | null>(null);
  return useMutation({
    mutationFn: async (body: string) => {
      if (!threadId || !userId) throw new Error("Conversa e usuário são obrigatórios");
      if (!pending.current || pending.current.userId !== userId || pending.current.body !== body) {
        pending.current = { userId, body, externalId: `fitpro:msg:${crypto.randomUUID()}` };
      }
      const { data, error } = await withTimeout(invokeZap("messages.send", {
        method: "POST",
        body: { body, external_id: pending.current.externalId },
      }));
      if (error) throw error;
      pending.current = null;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["zap", "messages", threadId] }),
  });
}
