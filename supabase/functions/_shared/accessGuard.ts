type Handler=(req:Request)=>Response|Promise<Response>;
type Options={authorize:(header:string)=>Promise<{allowed:boolean;validateTargets?:(targets:string[])=>Promise<boolean>;consumeBudget?:()=>Promise<{allowed:boolean;retry_after:number}>}|null>;maxBodyBytes?:number};
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version'};
const error=(message:string,code:string,status:number)=>new Response(JSON.stringify({success:false,error:message,code}),{status,headers});
export function createAccessGuard(handler:Handler,{authorize,maxBodyBytes=65536}:Options):Handler{
 return async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'}});
  const length=Number(req.headers.get('content-length'));
  if(Number.isFinite(length)&&length>maxBodyBytes)return error('O arquivo ou solicitação excede o tamanho permitido.','payload_too_large',413);
  const authorization=req.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))return error('Entre na sua conta para continuar.','account_required',401);
  let access:Awaited<ReturnType<Options['authorize']>>;
  try{
   access=await authorize(authorization);
   if(!access)return error('Entre em uma conta válida.','account_required',401);
   if(!access.allowed)return error('Seu acesso precisa ser renovado. Consulte sua assinatura.','subscription_required',402);
  }catch{return error('Não foi possível conferir seu acesso. Tente novamente.','access_unavailable',503)}
  const targets:string[]=[];const fields=new Set(['userid','athleteid','studentid']);
  function gather(value:unknown,depth=0,parent=''){
   if(!value||typeof value!=='object'||depth>4)return;
   if(Array.isArray(value)){for(const item of value)gather(item,depth+1,parent.replace(/s$/,''));return;}
   for(const [key,field] of Object.entries(value)){
    const name=key.replace(/_/g,'').toLowerCase();
    if((fields.has(name)||(name==='id'&&['user','athlete','student'].includes(parent)))&&typeof field==='string'&&field)targets.push(field);
    else if(fields.has(name.replace(/s$/,''))&&Array.isArray(field)){for(const id of field)if(typeof id==='string'&&id)targets.push(id);}
    else if(field&&typeof field==='object')gather(field,depth+1,name);
   }
  }
  for(const [key,val] of new URL(req.url).searchParams)if(fields.has(key.replace(/_/g,'').toLowerCase())&&val)targets.push(val);
  async function validTargets(){
   if(!targets.length||!access?.validateTargets)return true;
   const unique=[...new Set(targets)];if(unique.length>20)return false;
   return access.validateTargets(unique);
  }
  async function budget(){
   if(!access?.consumeBudget)return null;
   try{const result=await access.consumeBudget();if(result.allowed)return null;const response=error('Muitas solicitações em sequência. Aguarde antes de tentar novamente.','rate_limited',429);response.headers.set('Retry-After',String(Math.max(1,result.retry_after||60)));return response}
   catch{return error('Não foi possível confirmar sua solicitação. Tente novamente.','budget_unavailable',503)}
  }
  if(!req.body){try{if(!await validTargets())return error('O perfil solicitado não pertence ao seu acesso.','target_access_denied',403)}catch{return error('Não foi possível confirmar o perfil solicitado.','access_unavailable',503)}return (await budget())||handler(req)}
  const reader=req.body.getReader();const chunks:Uint8Array[]=[];let total=0;
  try{
   while(true){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>maxBodyBytes){void reader.cancel().catch(()=>{});return error('O arquivo ou solicitação excede o tamanho permitido.','payload_too_large',413)}chunks.push(part.value)}
  }catch{return error('Não foi possível ler sua solicitação.','invalid_body',400)}
  finally{reader.releaseLock()}
  const body=new Uint8Array(total);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength}
  try{gather(JSON.parse(new TextDecoder().decode(body)))}catch{ /* Existing handler validates its own content type and JSON contract. */ }
  try{if(!await validTargets())return error('O perfil solicitado não pertence ao seu acesso.','target_access_denied',403)}catch{return error('Não foi possível confirmar o perfil solicitado.','access_unavailable',503)}
  return (await budget())||handler(new Request(req,{body}));
 };
}
