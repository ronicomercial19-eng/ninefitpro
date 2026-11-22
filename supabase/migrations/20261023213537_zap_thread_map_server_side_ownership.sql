create table if not exists public.zap_thread_map (
  user_id uuid primary key,
  athlete_id uuid,
  thread_id text not null,
  external_key text not null,
  created_at timestamptz not null default now()
);
comment on table public.zap_thread_map is '9ZAP: mapa usuário -> thread do Core. Só o zap-proxy (service_role) lê/grava; o navegador nunca informa thread_id.';
alter table public.zap_thread_map enable row level security;
revoke all on public.zap_thread_map from anon, authenticated;;
