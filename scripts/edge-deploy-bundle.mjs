import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const slug=process.argv[2];if(!slug||!/^[a-z0-9-]+$/.test(slug))throw new Error('Expected function slug');
const root=fileURLToPath(new URL('../supabase/functions/',import.meta.url));
const files=[];const seen=new Set();
async function collect(file){
 const name=path.relative(root,file).replace(/\\/g,'/');if(name.startsWith('..')||path.isAbsolute(name))throw new Error('Dependency outside functions root');
 if(seen.has(name))return;seen.add(name);const content=await readFile(file,'utf8');files.push({name,content});
 for(const match of content.matchAll(/(?:from\s*|import\s*\(?)['"](\.[^'"]+)['"]/g))await collect(path.resolve(path.dirname(file),match[1]));
}
await collect(path.join(root,slug,'index.ts'));
console.log(JSON.stringify({entrypoint_path:slug+'/index.ts',files}));
