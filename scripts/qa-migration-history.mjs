import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../supabase/migrations/',import.meta.url);
const recorded=JSON.parse(await readFile(new URL('../supabase/migration-references/remote-history.json',import.meta.url),'utf8'));
const files=(await readdir(root)).filter(f=>f.endsWith('.sql'));
const versions=files.map(f=>f.match(/^(\d{14})_/)?.[1]);
assert.ok(versions.every(Boolean),'Active migrations require CLI-compatible version_name.sql filenames');
assert.equal(new Set(versions).size,versions.length,'Migration versions must be unique');
for(const row of recorded){const name=files.find(f=>f.startsWith(row.version+'_'));assert.ok(name,`Missing applied migration ${row.version}`);const sql=(await readFile(new URL(name,root),'utf8')).replace(/\r\n/g,'\n');assert.equal(createHash('sha256').update(sql).digest('hex'),row.sha256,`Applied migration ${row.version} must not be edited`);}
console.log(`PASS ${recorded.length} recorded migrations preserved with matching versions and SQL hashes`);
