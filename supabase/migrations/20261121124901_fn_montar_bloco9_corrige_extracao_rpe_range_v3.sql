
CREATE OR REPLACE FUNCTION pg_temp.patch_fn(p_name text, p_old text, p_new text) RETURNS int
LANGUAGE plpgsql AS $p$
DECLARE r record; d text; occ int; cnt int := 0;
BEGIN
  FOR r IN SELECT p.oid, pg_get_functiondef(p.oid) AS def FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace AND p.proname = p_name LOOP
    d := r.def;
    occ := (length(d) - length(replace(d, p_old, ''))) / length(p_old);
    IF occ = 1 THEN
      EXECUTE replace(d, p_old, p_new);
      cnt := cnt + 1;
    ELSIF occ > 1 THEN
      RAISE EXCEPTION 'marcador ambiguo em %', p_name;
    END IF;
  END LOOP;
  RETURN cnt;
END $p$;

DO $do$
BEGIN
  IF pg_temp.patch_fn('fn_montar_bloco9_exercicios',
    E'''rpe'',coalesce(nullif(regexp_replace(coalesce(p_rpe,''''),''[^0-9]'','''',''g''),'''')::numeric,6),',
    E'''rpe'',LEAST(10,GREATEST(1,ROUND(coalesce(nullif((regexp_match(coalesce(p_rpe,''''),''[0-9]+(\\.[0-9]+)?''))[1],''''))::numeric,6))),') <> 1 THEN
    RAISE EXCEPTION 'patch falhou';
  END IF;
END $do$;
;
