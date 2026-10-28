import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../../../public/push-events.js',import.meta.url),'utf8');
function worker(){
 const events:Record<string,(event:any)=>void>={},notifications:any[]=[],opened:string[]=[];
 runInNewContext(source,{URL,self:{location:{origin:'https://ninefitpro.lovable.app'},addEventListener:(name:string,fn:any)=>events[name]=fn,registration:{showNotification:async(...args:any[])=>{notifications.push(args)}}},clients:{matchAll:async()=>[],openWindow:async(url:string)=>{opened.push(url)}}});
 return {events,notifications,opened};
}
test('generated-worker push extension bounds messages and rejects external notification destinations',async()=>{
 const w=worker();let pending:Promise<unknown>|undefined;
 w.events.push({data:{json:()=>({title:'a'.repeat(500),body:'b'.repeat(2000),url:'https://evil.example/steal'})},waitUntil:(p:Promise<unknown>)=>pending=p});await pending;
 assert.equal(w.notifications[0][0].length,150);assert.equal(w.notifications[0][1].body.length,1000);
 assert.equal(w.notifications[0][1].data.url,'https://ninefitpro.lovable.app/9fit/notificacoes');
});
test('notification click opens only an internal student route',async()=>{
 const w=worker();let pending:Promise<unknown>|undefined;
 w.events.notificationclick({notification:{close(){},data:{url:'javascript:alert(1)'}},waitUntil:(p:Promise<unknown>)=>pending=p});await pending;
 assert.deepEqual(w.opened,['https://ninefitpro.lovable.app/9fit/notificacoes']);
 w.events.notificationclick({notification:{close(){},data:{url:'/9fit/train'}},waitUntil:(p:Promise<unknown>)=>pending=p});await pending;
 assert.equal(w.opened[1],'https://ninefitpro.lovable.app/9fit/train');
});
