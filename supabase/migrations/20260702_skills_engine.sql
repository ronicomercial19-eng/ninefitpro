-- supabase/migrations/20260702_skills_engine.sql
-- Skill Engine: tables, triggers and basic nexus sync trigger

-- 1) skills catalog
CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL, -- e.g. SKILL-01
  name text NOT NULL,
  version text DEFAULT '1.0',
  tier int DEFAULT 1,
  description text,
  content jsonb DEFAULT '{}'::jsonb, -- arbitrary payload / manifest
  installed boolean DEFAULT false,
  activated boolean DEFAULT false, -- when activated, Nexus should sync
  installed_by uuid,
  installed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) skills installation history (audit)
CREATE TABLE IF NOT EXISTS public.skill_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  installed_by uuid,
  installed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 3) student_skill assignment (what each athlete has active)
CREATE TABLE IF NOT EXISTS public.student_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  active boolean DEFAULT true,
  installed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (athlete_id, skill_id)
);

-- 4) nexus_sync_logs for observability
CREATE TABLE IF NOT EXISTS public.nexus_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid REFERENCES public.skills(id),
  event text NOT NULL, -- 'publish','sync','error'
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- 5) function to upsert student_skills for all athletes when a skill is activated
CREATE OR REPLACE FUNCTION public.nexus_publish_skill_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  ins_count int := 0;
BEGIN
  -- Only act when skill becomes activated
  IF TG_OP = 'UPDATE' THEN
    IF NEW.activated = OLD.activated THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NOT NEW.activated THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.activated THEN
    -- Log publish intent
    INSERT INTO public.nexus_sync_logs (skill_id, event, payload) VALUES (NEW.id, 'publish', row_to_json(NEW));

    -- Upsert student_skill for all active athletes (athletes table used in repo)
    FOR r IN SELECT id FROM public.athletes WHERE activated = true LOOP
      BEGIN
        INSERT INTO public.student_skills (athlete_id, skill_id, active, installed_at, metadata)
        VALUES (r.id, NEW.id, true, now(), jsonb_build_object('version', NEW.version))
        ON CONFLICT (athlete_id, skill_id) DO UPDATE SET active = true, installed_at = now(), metadata = public.student_skills.metadata || jsonb_build_object('version', NEW.version);
        GET DIAGNOSTICS ins_count = ROW_COUNT;
      EXCEPTION WHEN OTHERS THEN
        -- Log but continue
        INSERT INTO public.nexus_sync_logs (skill_id, event, payload) VALUES (NEW.id, 'error', jsonb_build_object('athlete_id', r.id, 'error', SQLERRM));
      END;
    END LOOP;

    -- final log
    INSERT INTO public.nexus_sync_logs (skill_id, event, payload) VALUES (NEW.id, 'sync', jsonb_build_object('upserted_count', ins_count));
  END IF;

  RETURN NEW;
END;
$$;

-- 6) trigger on skills insert/update
DROP TRIGGER IF EXISTS trg_nexus_publish_skill ON public.skills;
CREATE TRIGGER trg_nexus_publish_skill
AFTER INSERT OR UPDATE ON public.skills
FOR EACH ROW EXECUTE FUNCTION public.nexus_publish_skill_trigger();

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.skills TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.skill_installations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_skills TO authenticated;
GRANT SELECT, INSERT ON public.nexus_sync_logs TO authenticated;
GRANT ALL ON public.skills, public.skill_installations, public.student_skills, public.nexus_sync_logs TO service_role;

-- Enable RLS patterns are project-specific; ensure policies allow edge functions/service_role to run inserts/updates

