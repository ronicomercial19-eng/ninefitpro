import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { createPaymentHandler } from '../_shared/infinitepay.ts';
const url = Deno.env.get('SUPABASE_URL')!;
const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
Deno.serve(createPaymentHandler({ db, fetcher: fetch, apiKey: Deno.env.get('INFINITEPAY_API_KEY'), authenticate: async authorization => {
  const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser();
  return error || !user || !user.email_confirmed_at ? null : user;
} }));
