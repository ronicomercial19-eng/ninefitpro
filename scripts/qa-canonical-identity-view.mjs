import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {PGlite}=require(process.env.PGLITE_MODULE||'./qa-db/node_modules/@electric-sql/pglite');
const db=new PGlite();
const uid='10000000-0000-4000-8000-000000000001';
const older='20000000-0000-4000-8000-000000000001',newer='20000000-0000-4000-8000-000000000002';
try {
 await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE TABLE public.profiles(user_id uuid,email text,full_name text,role text,is_active boolean,first_access_completed boolean);
 CREATE TABLE public.athletes(id uuid,user_id uuid,created_at timestamptz,aluno_id uuid,coach_id uuid,name text,email text,activated boolean);
 CREATE TABLE public.athlete_auth_link(user_id uuid,athlete_id uuid);
 CREATE TABLE public.alunos(id uuid,professor_id uuid,nome text,email text);
 CREATE TABLE public.user_roles(user_id uuid,role text);
 INSERT INTO public.profiles VALUES('${uid}','test@example.invalid','Aluno','student',true,true);
 INSERT INTO public.user_roles VALUES('${uid}','student');
 INSERT INTO public.athletes VALUES('${older}','${uid}','2026-01-01',null,null,'Antigo',null,true),('${newer}','${uid}','2026-02-01',null,null,'Atual',null,true);
 INSERT INTO public.athlete_auth_link VALUES('${uid}','${older}');
 CREATE FUNCTION public.fn_current_athlete_id() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT a.id FROM public.athletes a WHERE a.user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.user_id=auth.uid() AND l.athlete_id=a.id)
 ORDER BY CASE WHEN a.user_id=auth.uid() THEN 0 ELSE 1 END,a.created_at DESC LIMIT 1 $$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated;
 GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
 SELECT set_config('request.jwt.claim.sub','${uid}',false);`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261029105935_canonical_identity_view.sql',import.meta.url),'utf8'));
 await db.exec('GRANT SELECT ON public.vw_current_identity TO authenticated; SET ROLE authenticated;');
 const read=async()=> (await db.query('SELECT * FROM public.vw_current_identity')).rows;
 let rows=await read();
 assert.equal(rows.length,1); assert.equal(rows[0].athlete_id,newer); assert.equal(rows[0].athlete_name,'Atual');
 assert.equal(rows[0].profile_role,'student'); assert.deepEqual(rows[0].roles,[{role:'student'}]);
 await db.exec('RESET ROLE; DELETE FROM public.athlete_auth_link; SET ROLE authenticated;');
 rows=await read();assert.equal(rows[0].athlete_id,newer);
 await db.exec(`RESET ROLE;UPDATE public.athletes SET user_id=null;INSERT INTO public.athlete_auth_link VALUES('${uid}','${older}');SET ROLE authenticated;`);
 rows=await read();assert.equal(rows[0].athlete_id,older);
 await db.exec(`RESET ROLE;DELETE FROM public.athlete_auth_link;SET ROLE authenticated;`);
 rows=await read();assert.equal(rows.length,1);assert.equal(rows[0].athlete_id,null);
 await db.exec("SELECT set_config('request.jwt.claim.sub','',false);");
 rows=await read();assert.equal(rows.length,0);
 console.log(JSON.stringify({checks:10,scenarios:['conflicting legacy link','primary-only','link-only','no athlete','no session'],realDataChanged:0}));
} finally { await db.close(); }
