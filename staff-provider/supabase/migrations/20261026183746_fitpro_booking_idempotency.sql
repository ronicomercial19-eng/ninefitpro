-- Target: Staff team xtexysqtfsofdohujtfr, never the FitPro database.
CREATE UNIQUE INDEX IF NOT EXISTS staff_fitpro_external_ref
ON public.staff_bookings(source,external_ref)
WHERE source='fitpro' AND external_ref IS NOT NULL;
