
-- Drop all class_bookings policies that query auth.users directly
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Usuários podem cancelar seus agendamentos" ON public.class_bookings;
DROP POLICY IF EXISTS "Usuários podem criar agendamentos" ON public.class_bookings;
DROP POLICY IF EXISTS "Usuários podem deletar seus agendamentos" ON public.class_bookings;
DROP POLICY IF EXISTS "Usuários podem ver seus agendamentos" ON public.class_bookings;

-- Recreate using current_user_email() (SECURITY DEFINER, no direct auth.users access)
CREATE POLICY "Users can view own bookings" ON public.class_bookings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_email = current_user_email());

CREATE POLICY "Users can insert own bookings" ON public.class_bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_email = current_user_email());

CREATE POLICY "Users can update own bookings" ON public.class_bookings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_email = current_user_email());

CREATE POLICY "Users can delete own bookings" ON public.class_bookings
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR user_email = current_user_email());

-- Allow admins/trainers full access to class_bookings
CREATE POLICY "Trainers can manage all bookings" ON public.class_bookings
  FOR ALL TO authenticated
  USING (is_trainer(auth.uid()));
