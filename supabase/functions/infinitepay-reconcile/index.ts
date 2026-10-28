import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import {createReconcileHandler} from '../_shared/paymentReconcile.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createReconcileHandler({db,fetcher:fetch,apiKey:Deno.env.get('INFINITEPAY_API_KEY')}));
