
CREATE POLICY "Staff vê e gerencia todos os agendamentos"
ON public.appointments FOR ALL
USING (is_trainer(auth.uid()))
WITH CHECK (is_trainer(auth.uid()));
;
