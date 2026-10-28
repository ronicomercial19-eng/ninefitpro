import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {PGlite}=require(process.env.PGLITE_MODULE||'./qa-db/node_modules/@electric-sql/pglite');
const db=new PGlite();let checks=0;
const check=(name,fn)=>{fn();checks++;console.log('PASS',name)};
const sql=await readFile(new URL('../supabase/migrations/20261028173013_hoist_remaining_policy_identity_checks.sql',import.meta.url),'utf8');
const snapshot=JSON.parse(await readFile(new URL('./fixtures/rls-identity-before.json',import.meta.url),'utf8'));
const tables=['secure_data','role_scope','jwt_scope','mixed_scope'];
const uid=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
 check('299 exact catalog clauses are guarded against deployment drift',()=>{
  assert.equal(snapshot.length,299);
  for(const p of snapshot)for(const expression of [p.qual,p.with_check])assert.ok(sql.includes(createHash('md5').update(expression??'').digest('hex')));
 });
 check('no quoted SQL literal in the catalog can be rewritten as a function call',()=>{
  for(const p of snapshot)for(const expression of [p.qual,p.with_check])for(const match of (expression??'').matchAll(/'(?:''|[^'])*'/g))assert.doesNotMatch(match[0],/auth\.(uid|jwt|role)\(\)/);
 });
 await db.exec(`
 CREATE ROLE authenticated;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('qa.uid',true),'')::uuid$$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('qa.role',true)$$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT current_setting('qa.jwt',true)::jsonb$$;
 GRANT USAGE ON SCHEMA auth TO authenticated;
 CREATE TABLE public.members(user_id uuid,group_id int);
 INSERT INTO public.members VALUES('${uid(1)}',1),('${uid(2)}',2);
 GRANT SELECT ON public.members TO authenticated;
 `);
 for(const table of tables)await db.exec(`CREATE TABLE public.${table}(id int PRIMARY KEY,user_id uuid,group_id int);INSERT INTO public.${table} SELECT n,('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,(n%2)+1 FROM generate_series(1,3000)n;ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;GRANT SELECT,INSERT,UPDATE,DELETE ON public.${table} TO authenticated;`);
 await db.exec(`
 CREATE POLICY context_scope ON public.secure_data TO authenticated USING(user_id=auth.uid() OR (auth.jwt()->'app_metadata'->>'role')='admin' OR EXISTS(SELECT 1 FROM public.members m WHERE m.user_id=auth.uid() AND m.group_id=secure_data.group_id)) WITH CHECK(user_id=auth.uid() OR(auth.jwt()->'app_metadata'->>'role')='admin');
 CREATE POLICY role_scope ON public.role_scope TO authenticated USING(auth.role()='authenticated' AND user_id=auth.uid()) WITH CHECK(auth.role()='authenticated' AND user_id=auth.uid());
 CREATE POLICY jwt_scope ON public.jwt_scope TO authenticated USING((auth.jwt()->>'is_anonymous')::boolean IS FALSE AND user_id=auth.uid()) WITH CHECK((auth.jwt()->>'is_anonymous')::boolean IS FALSE AND user_id=auth.uid());
 CREATE POLICY mixed_scope ON public.mixed_scope TO authenticated USING(user_id=(SELECT auth.uid()) OR user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
 `);
 const scopes=async()=>{
  const results=[];
  for(const actor of [{id:uid(1),role:'student',anonymous:false},{id:uid(2),role:'professor',anonymous:false},{id:uid(3),role:'admin',anonymous:false},{id:'',role:'student',anonymous:true}]){
   await db.query("SELECT set_config('qa.uid',$1,false),set_config('qa.jwt',$2,false),set_config('qa.role',$3,false)",[actor.id,JSON.stringify({is_anonymous:actor.anonymous,app_metadata:{role:actor.role}}),actor.anonymous?'anon':'authenticated']);
   await db.exec('SET ROLE authenticated;');
   for(const table of tables){const r=await db.query(`SELECT id FROM public.${table} ORDER BY id`);results.push([actor.role,actor.anonymous,table,r.rows.map(x=>x.id)]);}
   if(actor.id===uid(1))await assert.rejects(()=>db.exec(`INSERT INTO public.role_scope VALUES(9000,'${uid(3)}',1)`),/row-level security/);
   await db.exec('RESET ROLE;');
  }
  return results;
 };
 const before=await scopes();
 const policies=(await db.query("SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname")).rows;
 const helper=sql.split('-- BEGIN IDENTITY REWRITE HELPER')[1].split('-- END IDENTITY REWRITE HELPER')[0];
 await db.exec(helper);
 for(const p of policies){
  for(const [key,clause] of [['qual','USING'],['with_check','WITH CHECK']])if(p[key]){
   const rewritten=(await db.query('SELECT pg_temp.fitpro_hoist_identity($1) expression',[p[key]])).rows[0].expression;
   await db.exec(`ALTER POLICY "${p.policyname}" ON public."${p.tablename}" ${clause}(${rewritten})`);
  }
 }
 const after=await scopes();
 check('3,000-row scopes are identical for student, professional, administrator and anonymous claims',()=>assert.deepEqual(after,before));
 const updated=(await db.query("SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname")).rows;
 check('roles, commands and permissive/restrictive mode are unchanged',()=>{
  const scope=rows=>rows.map(({tablename,policyname,roles,cmd,permissive})=>({tablename,policyname,roles,cmd,permissive}));
  assert.deepEqual(scope(updated),scope(policies));
 });
 await db.exec(`SELECT set_config('qa.uid','${uid(1)}',false);SET ROLE authenticated;`);
 const plan=JSON.stringify((await db.query('EXPLAIN SELECT * FROM public.role_scope WHERE id<100')).rows);
 check('planned authentication is evaluated as an InitPlan',()=>assert.match(plan,/InitPlan/));
 console.log(JSON.stringify({checks,fixtureAccounts:3000,productionLoadTest:false}));
}finally{await db.close()}
