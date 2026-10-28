import {INFINITEPAY_HANDLE,paymentReference,providerRequest} from './infinitepay.ts';
type Dependencies={db:any;fetcher:typeof fetch;apiKey?:string};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
export function createReconcileHandler({db,fetcher,apiKey}:Dependencies){
 return async(req:Request)=>{
  if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
  const token=req.headers.get('x-job-token')||'';
  if(token.length<64||token.length>128)return reply({error:'unauthorized'},401);
  const auth=await db.rpc('fn_fitpro_check_job_token',{p_token:token});
  if(auth.error)return reply({error:'job_auth_unavailable'},503);
  if(auth.data!==true)return reply({error:'unauthorized'},401);
  const claim=await db.rpc('fn_fitpro_claim_payment_checks',{p_limit:20});
  if(claim.error||!Array.isArray(claim.data))return reply({error:'claim_unavailable'},503);
  const rows=claim.data.slice(0,20);let index=0,confirmed=0,suspended=0,errors=0;
  await Promise.all(Array.from({length:Math.min(4,rows.length)},async()=>{
   while(index<rows.length){
    const row=rows[index++];let verification:unknown={};
    try{const reference=paymentReference({order_nsu:row.id,transaction_nsu:row.transaction_nsu,slug:row.invoice_slug});verification=await providerRequest('/payment_check',{handle:INFINITEPAY_HANDLE,...reference},fetcher,apiKey)}catch{ /* An outage is not proof of nonpayment. */ }
    try{
     const applied=await db.rpc('fn_fitpro_apply_payment_check',{p_order_id:row.id,p_verification:verification});
     if(applied.error){errors++;continue}
     if(applied.data?.confirmed)confirmed++;else if(applied.data?.suspended)suspended++;else errors++;
    }catch{errors++}
   }
  }));
  const recorded=await db.rpc('fn_fitpro_record_reconcile',{p_checked:rows.length,p_errors:errors});
  if(recorded.error)return reply({error:'monitor_unavailable',checked:rows.length},503);
  return reply({job:'fitpro-payment-reconcile',checked:rows.length,confirmed,suspended,errors});
 };
}
