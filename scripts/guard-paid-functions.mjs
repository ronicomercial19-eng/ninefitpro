import ts from 'typescript';
import {readFile,writeFile} from 'node:fs/promises';
const targets=['generate-workouts','generate-workout','ai-chat-assistant','ai-dynamic-recommendations','ai-video-analysis','generate-recommendations','generate-full-plan','generate-smart-treino','ai-coach','ai-coach-chat','api-connector-proxy','generate-quick-workout','healthflix-proxy','library-full-proxy','postura-pro-scan','generate-training-html','smartreino-proxy','smartperiodizer-proxy','food-scan','training-ai-adjust','community-proxy','get-base44-training-plans'];
let guarded=0;
for(const slug of targets){
 const path=new URL(`../supabase/functions/${slug}/index.ts`,import.meta.url);
 let code=await readFile(path,'utf8');
 const source=ts.createSourceFile('index.ts',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);const handlers=[];
 function visit(node){if(ts.isCallExpression(node)&&node.arguments.length&&((ts.isIdentifier(node.expression)&&node.expression.text==='serve')||(ts.isPropertyAccessExpression(node.expression)&&node.expression.getText(source)==='Deno.serve')))handlers.push(node.arguments[0]);ts.forEachChild(node,visit)}visit(source);
 if(handlers.length!==1)throw new Error('Unexpected handler contract: '+slug+' '+handlers.length);
 const handler=handlers[0];const already=ts.isCallExpression(handler)&&handler.expression.getText(source)==='withPaidAccess';
 const inner=already?handler.arguments[0]:handler;
 const options=`, {bucket:'${/proxy|base44/.test(slug)?'content':'ai'}'${/scan|video/.test(slug)?',maxBodyBytes:12582912':''}}`;
 code=code.slice(0,handler.getStart(source))+'withPaidAccess('+inner.getText(source)+options+')'+code.slice(handler.end);
 if(!already)code='import {withPaidAccess} from "../_shared/paidAccess.ts";\n'+code;
 await writeFile(path,code);guarded++;
}
console.log(JSON.stringify({guarded,targets}));
