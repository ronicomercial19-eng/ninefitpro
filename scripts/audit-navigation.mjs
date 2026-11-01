import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), norm=p=>p.replaceAll('\\','/');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=walk('src').filter(p=>/\.(tsx?|jsx?)$/.test(p)), graph=new Map(),incoming=new Map();
const external = ['scripts', 'sdk'].filter(fs.existsSync).flatMap(walk).filter(p=>/\.(tsx?|m?jsx?)$/.test(p)).concat(fs.existsSync('server.ts') ? ['server.ts'] : []);
function resolve(from,s){const p=s.startsWith('@/')?'src/'+s.slice(2):s.startsWith('.')?path.join(path.dirname(from),s):null;if(!p)return null;return [p,p+'.ts',p+'.tsx',p+'.js',p+'/index.ts',p+'/index.tsx'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());}
for(const file of [...files, ...external]){const deps=ts.preProcessFile(fs.readFileSync(file,'utf8'),true,true).importedFiles.map(i=>resolve(file,i.fileName)).filter(Boolean).map(norm);graph.set(norm(file),deps);for(const d of deps)incoming.set(d,[...(incoming.get(d)||[]),norm(file)]);}
const seen=new Set();function visit(p){if(seen.has(p))return;seen.add(p);for(const dep of graph.get(p)||[])visit(dep);}visit('src/main.tsx');const appReachable=seen.size;// Keep documented integration entry points, even when consumed outside this app.
for (const file of [...external, 'src/services/index.ts', 'src/sdk/zap-sdk.ts']) visit(norm(file));
const dead=files.map(norm).filter(p=>!seen.has(p)&&!p.endsWith('.d.ts')&&!/\.(test|spec)\./.test(p));
fs.mkdirSync('output/navigation-audit',{recursive:true});fs.writeFileSync('output/navigation-audit/source-graph.json',JSON.stringify({dead,graph:Object.fromEntries(graph),incoming:Object.fromEntries(incoming)},null,2));
console.log(JSON.stringify({total:files.length,appReachable,allEntrypoints:seen.size,deadPages:dead.filter(p=>p.includes('/pages/')),deadNinefit:dead.filter(p=>p.includes('/components/9fit/'))},null,2));
