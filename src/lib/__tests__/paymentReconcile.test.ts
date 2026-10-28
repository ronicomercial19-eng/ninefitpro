import assert from 'node:assert/strict';import {test} from 'node:test';
import {createReconcileHandler} from '../../../supabase/functions/_shared/paymentReconcile';
test('cron secret is checked before leasing any payment checks',async()=>{
 let claims=0;const handler=createReconcileHandler({db:{rpc:async(name:string)=>{if(name==='fn_fitpro_check_job_token')return {data:false};claims++;return {data:[]}}},fetcher:fetch});
 assert.equal((await handler(new Request('https://test.invalid',{method:'POST'}))).status,401);
 assert.equal((await handler(new Request('https://test.invalid',{method:'POST',headers:{'x-job-token':'a'.repeat(72)}}))).status,401);assert.equal(claims,0);
});
test('provider errors are recorded as unknown, never synthesized as unpaid',async()=>{
 const proofs:any[]=[];const db={rpc:async(name:string,args:any)=>{
  if(name==='fn_fitpro_check_job_token')return {data:true};
  if(name==='fn_fitpro_claim_payment_checks')return {data:[{id:'10000000-0000-4000-8000-000000000001',transaction_nsu:'txn',invoice_slug:'slug'}]};
  if(name==='fn_fitpro_record_reconcile')return {data:null};
  proofs.push(args.p_verification);return {data:{confirmed:false,suspended:false}};
 }};
 const handler=createReconcileHandler({db,fetcher:(async()=>{throw Error('offline')}) as typeof fetch});
 const response=await handler(new Request('https://test.invalid',{method:'POST',headers:{'x-job-token':'a'.repeat(72)}}));
 assert.deepEqual(proofs,[{}]);assert.deepEqual(await response.json(),{job:'fitpro-payment-reconcile',checked:1,confirmed:0,suspended:0,errors:1});
});
