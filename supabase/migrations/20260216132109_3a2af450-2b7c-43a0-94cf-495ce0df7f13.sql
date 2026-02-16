
-- =============================================
-- BLOCO 1: RLS critico - athletes self-view
-- =============================================

-- Allow athletes to read their OWN record via user_id
CREATE POLICY "Athletes can view own profile via user_id"
  ON public.athletes FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =============================================
-- BLOCO 2: Aulas de exemplo para Fev/Mar 2026
-- =============================================

INSERT INTO public.gym_classes (class_name, class_datetime, location, instructor_name, available_slots, credits_required, class_type, description) VALUES
  -- Semana 17-21 Fev
  ('Musculação', '2026-02-17 07:00:00+00', 'Sala Principal', 'Prof. Carlos', 20, 1, 'musculacao', 'Treino de musculação guiado'),
  ('Funcional', '2026-02-17 18:00:00+00', 'Sala 2', 'Prof. Ana', 15, 1, 'funcional', 'Treino funcional intenso'),
  ('Pilates', '2026-02-18 08:00:00+00', 'Studio', 'Prof. Maria', 12, 2, 'pilates', 'Pilates reformer'),
  ('Musculação', '2026-02-18 17:00:00+00', 'Sala Principal', 'Prof. Carlos', 20, 1, 'musculacao', 'Treino de musculação guiado'),
  ('HIIT', '2026-02-19 06:30:00+00', 'Sala 2', 'Prof. Ana', 15, 1, 'hiit', 'Treino intervalado de alta intensidade'),
  ('Yoga', '2026-02-19 19:00:00+00', 'Studio', 'Prof. Maria', 10, 1, 'yoga', 'Yoga restaurativa'),
  ('Funcional', '2026-02-20 07:00:00+00', 'Sala 2', 'Prof. Ana', 15, 1, 'funcional', 'Treino funcional'),
  ('Musculação', '2026-02-20 18:00:00+00', 'Sala Principal', 'Prof. Carlos', 20, 1, 'musculacao', 'Treino de musculação'),
  ('Spinning', '2026-02-21 07:00:00+00', 'Sala Spinning', 'Prof. Lucas', 25, 1, 'spinning', 'Aula de spinning'),
  ('Pilates', '2026-02-21 17:00:00+00', 'Studio', 'Prof. Maria', 12, 2, 'pilates', 'Pilates mat'),
  -- Semana 24-28 Fev
  ('Musculação', '2026-02-24 07:00:00+00', 'Sala Principal', 'Prof. Carlos', 20, 1, 'musculacao', 'Treino de musculação'),
  ('Funcional', '2026-02-24 18:00:00+00', 'Sala 2', 'Prof. Ana', 15, 1, 'funcional', 'Treino funcional'),
  ('HIIT', '2026-02-25 06:30:00+00', 'Sala 2', 'Prof. Ana', 15, 1, 'hiit', 'HIIT matinal'),
  ('Yoga', '2026-02-25 19:00:00+00', 'Studio', 'Prof. Maria', 10, 1, 'yoga', 'Yoga flow'),
  ('Musculação', '2026-02-26 07:00:00+00', 'Sala Principal', 'Prof. Carlos', 20, 1, 'musculacao', 'Treino guiado'),
  ('Spinning', '2026-02-26 18:00:00+00', 'Sala Spinning', 'Prof. Lucas', 25, 1, 'spinning', 'Spinning avançado'),
  ('Pilates', '2026-02-27 08:00:00+00', 'Studio', 'Prof. Maria', 12, 2, 'pilates', 'Pilates'),
  ('Funcional', '2026-02-27 17:00:00+00', 'Sala 2', 'Prof. Ana', 15, 1, 'funcional', 'Funcional'),
  ('Musculação', '2026-02-28 07:00:00+00', 'Sala Principal', 'Prof. Carlos', 20, 1, 'musculacao', 'Musculação'),
  -- Março 2026
  ('HIIT', '2026-03-02 06:30:00+00', 'Sala 2', 'Prof. Ana', 15, 1, 'hiit', 'HIIT'),
  ('Musculação', '2026-03-03 07:00:00+00', 'Sala Principal', 'Prof. Carlos', 20, 1, 'musculacao', 'Musculação'),
  ('Yoga', '2026-03-04 19:00:00+00', 'Studio', 'Prof. Maria', 10, 1, 'yoga', 'Yoga'),
  ('Funcional', '2026-03-05 07:00:00+00', 'Sala 2', 'Prof. Ana', 15, 1, 'funcional', 'Funcional'),
  ('Spinning', '2026-03-06 07:00:00+00', 'Sala Spinning', 'Prof. Lucas', 25, 1, 'spinning', 'Spinning');
