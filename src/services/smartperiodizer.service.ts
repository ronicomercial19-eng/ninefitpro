import { supabase } from "@/integrations/supabase/client";

type RequestOptions = {
  path: string;
  query?: string;
  method?: string;
  payload?: unknown;
};

export async function smartPeriodizerRequest<T = unknown>(options: RequestOptions): Promise<T> {
  const { data, error } = await supabase.functions.invoke("smartperiodizer-proxy", { body: options });
  if (error) throw error;
  return data as T;
}

export function smartPeriodizerQuery(fitproStudentId: string) {
  return `?fitpro_student_id=${encodeURIComponent(fitproStudentId)}`;
}
