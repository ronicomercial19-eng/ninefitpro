import fs from 'node:fs';
import ts from 'typescript';
const app=ts.createSourceFile('App.tsx',fs.readFileSync('src/App.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const routes=[];
function visit(n){if((ts.isJsxSelfClosingElement(n)||ts.isJsxOpeningElement(n))&&n.tagName.getText(app)==='Route'){const attr=n.attributes.properties.find(p=>p.name?.getText(app)==='path');if(attr?.initializer&&ts.isStringLiteral(attr.initializer))routes.push(attr.initializer.text);}ts.forEachChild(n,visit);}visit(app);
const matches=(url)=>{const path=url.split(/[?#]/)[0].split('/');return routes.some(route=>{const parts=route.split('/');return parts.length===path.length&&parts.every((part,i)=>part.startsWith(':')||part===path[i]);});};
const audited=['src/pages/9fit/Profile.tsx','src/pages/9fit/Settings.tsx','src/components/9fit/DigitalIDCard.tsx','src/components/9fit/DynamicPDI.tsx','src/components/9fit/CompleteProfileFlow.tsx','src/components/9fit/PDIWizard.tsx'];
const destinations={};
for(const file of audited){const found=new Set();const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function scan(n){if(ts.isStringLiteral(n)&&n.text.startsWith('/9fit/'))found.add(n.text);ts.forEachChild(n,scan);}scan(source);destinations[file]=[...found].map(url=>({url,registered:matches(url)}));}
const invalid=Object.values(destinations).flat().filter(d=>!d.registered);
fs.mkdirSync('output/navigation-audit', {recursive:true});
fs.writeFileSync('output/navigation-audit/profile-routes.json',JSON.stringify({routes:routes.filter(r=>r.startsWith('/9fit')),destinations,invalid},null,2));
console.log(JSON.stringify({audited:audited.length,links:Object.values(destinations).flat().length,invalid},null,2));
if(invalid.length)process.exitCode=1;
