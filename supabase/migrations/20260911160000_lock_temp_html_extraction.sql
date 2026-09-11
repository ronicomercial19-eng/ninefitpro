-- Legacy import table has no owner and no active dependents.
-- Lock it down instead of inventing an unsafe row policy.
ALTER TABLE public._temp_html_extraction ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public._temp_html_extraction FROM anon, authenticated;

