-- ========================================================================
-- 1) COMMUNITY FEED: tabela própria para posts de usuários da comunidade
--    (a tabela public.posts existente é o CMS de anúncios do admin;
--     Community.tsx/CreatePostModal.tsx esperavam user_id/post_type/cheer_count
--     que não existem lá. Criamos community_posts com o schema correto.)
-- ========================================================================
CREATE TYPE public.community_post_type AS ENUM ('achievement','progress','question','motivation');

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  post_type public.community_post_type NOT NULL DEFAULT 'motivation',
  cheer_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp read all" ON public.community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "cp insert own" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "cp update own" ON public.community_posts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "cp delete own" ON public.community_posts FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_community_posts_created ON public.community_posts(created_at DESC);

CREATE TABLE public.community_cheers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '🔥',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_cheers TO authenticated;
GRANT ALL ON public.community_cheers TO service_role;
ALTER TABLE public.community_cheers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc read all" ON public.community_cheers FOR SELECT TO authenticated USING (true);
CREATE POLICY "cc insert own" ON public.community_cheers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "cc delete own" ON public.community_cheers FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_community_cheer_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET cheer_count = cheer_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET cheer_count = GREATEST(0, cheer_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_cheer_count_insert AFTER INSERT ON public.community_cheers
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_cheer_count();
CREATE TRIGGER trg_cheer_count_delete AFTER DELETE ON public.community_cheers
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_cheer_count();

-- feed_visibility (Fase 1) referenciava public.posts; agora que existe um feed
-- de verdade, aponta para community_posts em vez disso.
ALTER TABLE public.feed_visibility DROP CONSTRAINT IF EXISTS feed_visibility_post_id_fkey;
ALTER TABLE public.feed_visibility
  ADD CONSTRAINT feed_visibility_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "fv write author" ON public.feed_visibility;
CREATE POLICY "fv write author" ON public.feed_visibility FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.user_id = auth.uid()));

-- ========================================================================
-- 2) API KEYS: tabela e função que a UI de Admin (AdminApiKeys.tsx) e a
--    edge function public-api já esperavam, mas nunca existiam no banco.
-- ========================================================================
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ak admin all" ON public.api_keys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- verify_api_key(raw): hashes the raw key with sha-256, looks up a matching,
-- non-revoked row, bumps last_used_at, and returns its scopes.
CREATE OR REPLACE FUNCTION public.verify_api_key(_raw text)
RETURNS TABLE(id uuid, scopes text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hash text;
  v_row record;
BEGIN
  v_hash := encode(digest(_raw, 'sha256'), 'hex');
  SELECT ak.id, ak.scopes INTO v_row
  FROM public.api_keys ak
  WHERE ak.key_hash = v_hash AND ak.revoked_at IS NULL;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.api_keys SET last_used_at = now() WHERE api_keys.id = v_row.id;
  RETURN QUERY SELECT v_row.id, v_row.scopes;
END; $$;
REVOKE EXECUTE ON FUNCTION public.verify_api_key(text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_api_key(text) TO service_role;

-- pgcrypto is required for digest(); enable if not already.
CREATE EXTENSION IF NOT EXISTS pgcrypto;;
