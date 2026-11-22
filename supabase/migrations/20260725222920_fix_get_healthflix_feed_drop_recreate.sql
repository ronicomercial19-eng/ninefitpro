
DROP FUNCTION IF EXISTS public.get_healthflix_feed(uuid);

CREATE OR REPLACE FUNCTION public.get_healthflix_feed(p_athlete_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_items json;
BEGIN
  SELECT json_agg(row_to_json(li)) INTO v_items
  FROM (
    SELECT id, name, category, subcategory, thumbnail_url, player_url, type, payload
    FROM public.library_items
    WHERE type IN ('video', 'videos', 'healthflix')
    ORDER BY
      CASE WHEN id::text IN (
        SELECT content_id FROM public.healthflix_progress 
        WHERE athlete_id = p_athlete_id
      ) THEN 1 ELSE 0 END,
      updated_at DESC NULLS LAST
    LIMIT 100
  ) li;

  RETURN json_build_object(
    'items', COALESCE(v_items, '[]'::json),
    'total', (SELECT COUNT(*) FROM library_items WHERE type IN ('video','videos','healthflix'))
  );
END;
$$;
;
