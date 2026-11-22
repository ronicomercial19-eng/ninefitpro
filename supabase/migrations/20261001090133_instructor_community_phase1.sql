-- Fase 1: comunidade de instrutores
CREATE TABLE public.instructor_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE, bio text, price numeric NOT NULL DEFAULT 0, expertise text[] NOT NULL DEFAULT '{}', verified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_profiles TO authenticated;
GRANT ALL ON public.instructor_profiles TO service_role;
ALTER TABLE public.instructor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ip read" ON public.instructor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "ip insert own" ON public.instructor_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ip update own or admin" ON public.instructor_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ip delete own" ON public.instructor_profiles FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.guard_instructor_verified() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN IF NOT public.has_role(auth.uid(),'admin') THEN NEW.verified := false; END IF;
  ELSIF NEW.verified IS DISTINCT FROM OLD.verified AND NOT public.has_role(auth.uid(),'admin') THEN NEW.verified := OLD.verified; END IF;
  NEW.updated_at := now(); RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_instructor_verified() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER instructor_profiles_guard BEFORE INSERT OR UPDATE ON public.instructor_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_instructor_verified();
CREATE TABLE public.instructor_subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, instructor_id uuid NOT NULL REFERENCES public.instructor_profiles(id) ON DELETE CASCADE, tier text NOT NULL DEFAULT 'basic', price numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, instructor_id));
GRANT SELECT ON public.instructor_subscriptions TO authenticated;
GRANT ALL ON public.instructor_subscriptions TO service_role;
ALTER TABLE public.instructor_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "is read own or instructor" ON public.instructor_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.instructor_profiles ip WHERE ip.id = instructor_id AND ip.user_id = auth.uid()));
CREATE OR REPLACE FUNCTION public.subscribe_to_instructor(p_instructor_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_ip record; v_status text; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('status','not_authenticated'); END IF;
  SELECT * INTO v_ip FROM public.instructor_profiles WHERE id = p_instructor_id;
  IF v_ip IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF v_ip.user_id = v_uid THEN RETURN jsonb_build_object('status','self'); END IF;
  v_status := CASE WHEN COALESCE(v_ip.price,0) <= 0 THEN 'active' ELSE 'pending' END;
  INSERT INTO public.instructor_subscriptions (user_id, instructor_id, price, status) VALUES (v_uid, p_instructor_id, COALESCE(v_ip.price,0), v_status)
  ON CONFLICT (user_id, instructor_id) DO UPDATE SET status = CASE WHEN instructor_subscriptions.status='canceled' THEN EXCLUDED.status ELSE instructor_subscriptions.status END
  RETURNING id, status INTO v_id, v_status;
  RETURN jsonb_build_object('status', v_status, 'id', v_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.subscribe_to_instructor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_instructor(uuid) TO authenticated;
CREATE TABLE public.instructor_groups (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), instructor_id uuid NOT NULL REFERENCES public.instructor_profiles(id) ON DELETE CASCADE, name text NOT NULL, description text, private boolean NOT NULL DEFAULT false, max_members integer, price numeric NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_groups TO authenticated;
GRANT ALL ON public.instructor_groups TO service_role;
ALTER TABLE public.instructor_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ig read" ON public.instructor_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "ig write owner" ON public.instructor_groups FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.instructor_profiles ip WHERE ip.id = instructor_id AND ip.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.instructor_profiles ip WHERE ip.id = instructor_id AND ip.user_id = auth.uid()));
CREATE TYPE public.post_visibility AS ENUM ('free','primepass','instructor_only');
CREATE TABLE public.feed_visibility (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE, visibility public.post_visibility NOT NULL DEFAULT 'free', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_visibility TO authenticated;
GRANT ALL ON public.feed_visibility TO service_role;
ALTER TABLE public.feed_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fv read" ON public.feed_visibility FOR SELECT TO authenticated USING (true);
CREATE POLICY "fv write author" ON public.feed_visibility FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));
CREATE OR REPLACE FUNCTION public.can_access_instructor_content(_user_id uuid, _instructor_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.instructor_subscriptions WHERE user_id=_user_id AND instructor_id=_instructor_id AND status='active')
      OR EXISTS (SELECT 1 FROM public.instructor_profiles WHERE id=_instructor_id AND user_id=_user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_instructor_content(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_instructor_content(uuid,uuid) TO authenticated;;
