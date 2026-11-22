
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
  IF pg_temp.patch_fn('fn_sugerir_protocolo_por_perfil',
    E'    ELSE ''performance''',
    E'    ELSE ''estrutural''') <> 1 THEN
    RAISE EXCEPTION 'patch ELSE falhou';
  END IF;
  IF pg_temp.patch_fn('fn_sugerir_protocolo_por_perfil',
    E'  WHERE pillar = v_pillar\n    AND (v_athlete.experience_level IS NULL',
    E'  WHERE pillar = v_pillar\n    AND public.fn_protocol_strength_compatible(id)\n    AND (v_athlete.experience_level IS NULL') <> 1 THEN
    RAISE EXCEPTION 'patch primeira consulta falhou';
  END IF;
  IF pg_temp.patch_fn('fn_sugerir_protocolo_por_perfil',
    'FROM public.smart_treino_protocols WHERE pillar = v_pillar ORDER BY random() LIMIT 1;',
    'FROM public.smart_treino_protocols WHERE pillar = v_pillar AND public.fn_protocol_strength_compatible(id) ORDER BY random() LIMIT 1;') <> 1 THEN
    RAISE EXCEPTION 'patch fallback falhou';
  END IF;
END $do$;
;
