export interface PaidAccess {allowed:boolean;reason:string;source:string;expires_at?:string|null;server_now:string}
const accountRoutes=['/9fit/ativacao','/9fit/first-access','/9fit/onboarding','/9fit/entrada','/9fit/checkout','/9fit/pagamento','/9fit/planos','/9fit/oferta','/9fit/prime','/9fit/profile','/9fit/notificacoes','/9fit/mensagens','/9fit/acompanhamento','/9fit/progresso','/9fit/aulas-creditos','/9fit/staff'];
export const isAccountRoute=(path:string)=>accountRoutes.some(route=>path===route||path.startsWith(route+'/'));
export function paidAccessAvailable(access:PaidAccess|undefined,serverTime=Date.now()){
 return !!access?.allowed && (!access.expires_at || Date.parse(access.expires_at)>serverTime);
}
export function parsePaidAccess(value:unknown):PaidAccess{
 const v=value as PaidAccess;
 if(!v || typeof v.allowed!=='boolean'||typeof v.reason!=='string'||typeof v.source!=='string'||!Number.isFinite(Date.parse(v.server_now))||(v.expires_at!=null&&!Number.isFinite(Date.parse(v.expires_at))))throw new Error('access_status_unavailable');
 return v;
}
