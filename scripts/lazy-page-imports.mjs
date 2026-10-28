// One-time safe route migration: default page imports only, no manual vendor chunks.
import ts from 'typescript';
import {readFile,writeFile} from 'node:fs/promises';
const path=new URL('../src/App.tsx',import.meta.url);
let code=await readFile(path,'utf8');
if(code.includes('const Auth = lazy(')) throw new Error('Routes already converted');
const file=ts.createSourceFile('App.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const edits=[];
for(const s of file.statements){
 if(!ts.isImportDeclaration(s)||!ts.isStringLiteral(s.moduleSpecifier)||!s.importClause?.name||s.importClause.namedBindings)continue;
 const spec=s.moduleSpecifier.text;if(!/(?:^\.\/|^@\/)pages\//.test(spec))continue;
 edits.push({start:s.getStart(file),end:s.end,text:`const ${s.importClause.name.text} = lazy(() => import(${JSON.stringify(spec)}));`});
}
if(edits.length<50)throw new Error('Unexpected page import contract');
for(const e of edits.reverse())code=code.slice(0,e.start)+e.text+code.slice(e.end);
code='import { lazy, Suspense } from "react";\n'+code;
code=code.replace('<Routes>','<Suspense fallback={<div className="min-h-[60vh] grid place-items-center" role="status">Carregando página…</div>}><Routes>').replace('</Routes>','</Routes></Suspense>');
await writeFile(path,code);console.log(JSON.stringify({lazyPages:edits.length}));
