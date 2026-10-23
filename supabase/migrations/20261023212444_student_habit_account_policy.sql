ALTER POLICY habits_owner ON public.student_habits
USING (user_id=(SELECT auth.uid()) AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE)
WITH CHECK (user_id=(SELECT auth.uid()) AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);
ALTER POLICY habit_days_read ON public.student_habit_days
USING (user_id=(SELECT auth.uid()) AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);
ALTER POLICY habit_days_add ON public.student_habit_days
WITH CHECK (user_id=(SELECT auth.uid()) AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND habit_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date);
ALTER POLICY habit_days_remove ON public.student_habit_days
USING (user_id=(SELECT auth.uid()) AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND habit_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date);
NOTIFY pgrst, 'reload schema';