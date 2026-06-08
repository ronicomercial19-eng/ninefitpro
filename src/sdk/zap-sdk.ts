// Lightweight 9ZAP client — chama nossa edge function `zap-proxy`.
import { supabase } from "@/integrations/supabase/client";

async function call(action: string, body?: any, init?: { method?: string }) {
  const method = init?.method || (body ? "POST" : "GET");
  const { data, error } = await supabase.functions.invoke(`zap-proxy?action=${action}`, {
    method: method as any,
    body: body ?? undefined,
  });
  if (error) throw error;
  return data;
}

export const zap = {
  upsertThread: (payload: {
    external_key: string; subject?: string;
    student_fitpro_id: string; trainer_fitpro_id: string;
    context?: Record<string, any>;
  }) => call("threads.upsert", payload),

  listThreads: (params: { student_fitpro_id?: string; trainer_fitpro_id?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return supabase.functions.invoke(`zap-proxy?action=threads&${qs}`, { method: "GET" })
      .then(({ data, error }) => { if (error) throw error; return data; });
  },

  listMessages: (thread_id: string) =>
    supabase.functions.invoke(`zap-proxy?action=messages.list&thread_id=${thread_id}`, { method: "GET" })
      .then(({ data, error }) => { if (error) throw error; return data; }),

  sendMessage: (payload: {
    thread_id: string;
    sender_type: "student" | "trainer";
    sender_external_id: string;
    body: string;
    client_message_id?: string;
  }) => call("messages.send", payload),

  markRead: (thread_id: string, reader_external_id: string) =>
    call("read", { thread_id, reader_external_id }),
};
