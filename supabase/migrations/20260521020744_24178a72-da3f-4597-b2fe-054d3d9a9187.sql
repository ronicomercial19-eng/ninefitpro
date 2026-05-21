
UPDATE public.student_library_assignments AS s
SET payload = li.payload,
    thumbnail_url = COALESCE(NULLIF(li.payload->>'thumbnailUrl',''), s.thumbnail_url),
    player_url    = COALESCE(NULLIF(li.payload->>'playerUrl',''),    s.player_url),
    access_url    = COALESCE(NULLIF(li.payload->>'episodeUrl',''),   s.access_url),
    download_url  = COALESCE(NULLIF(li.payload->>'downloadUrl',''),  s.download_url)
FROM public.library_items AS li
WHERE (li.slug = s.content_ref
    OR li.external_id = s.content_ref
    OR li.payload->>'slug' = s.content_ref
    OR li.payload->>'id'   = s.content_ref)
  AND s.payload IS NULL;
