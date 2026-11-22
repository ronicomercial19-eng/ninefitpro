create or replace view public.vw_fitpro_share_catalog
with (security_invoker = true)
as
select a.id as athlete_id,a.user_id,a.name as athlete_name,
 t.id as template_id,t.slug as template_slug,t.name as template_name,t.content_type,
 t.layout_html,t.layout_css,t.accent_color,t.preview_url,coalesce(t.active,false) as template_active,
 coalesce(ach.achievement_count,0)::bigint as achievement_count,
 coalesce(ev.share_count,0)::bigint as share_count,ev.last_shared_at
from public.athletes a
cross join lateral (select st.* from public.social_share_templates st where st.active=true) t
left join lateral (
 select count(*) as achievement_count from public.user_achievements ua
 where ua.athlete_id=a.id or ua.user_email=a.email
) ach on true
left join lateral (
 select count(*) as share_count,max(se.shared_at) as last_shared_at from public.share_events se
 where (se.athlete_id=a.id or se.user_id=a.user_id) and se.content_type=t.content_type
) ev on true;
comment on view public.vw_fitpro_share_catalog is 'Fase 9: catálogo de templates e contexto individual do atleta para compartilhamentos virais.';
grant select on public.vw_fitpro_share_catalog to authenticated;
