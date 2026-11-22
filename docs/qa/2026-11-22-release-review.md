# Release review — 2026-11-22

## Preview and repository

GitHub frontend jobs succeeded for fe1ffc8 and ac775be. The Supabase Preview checks failed because server-assigned migration versions were absent locally. Restored the 590 original recorded migration versions and statements, and the three newly applied security migrations. Original authoring scripts remain outside the deployment directory as regression fixtures. No remote history was deleted or relabeled, and no historical SQL was replayed in production. `qa-migration-history.mjs` verifies versions and normalized SQL hashes.

The Lovable preview had separate pre-existing Edge Function errors: unknown catch variables in analyze-periodization and sync-exercise-library, and unresolved npm:resend@4.0.0 in send-student-welcome. Replaced unsafe catch accesses with type narrowing; email uses the provider HTTP API and only reports success after a confirmed provider ID. Deno type validation covers all three.

## Security

Applied scoped workout/delivery, meal insert/update, nutrition, exercise and community read policies. Removed the broad paid-access exercise read (subscription is not ownership). Assessment writes now use fixed SQL, typed JSON values and existing actor/athlete guards. Removed seven anonymous SECURITY DEFINER execution grants; internal logging/trigger functions no longer have client execution grants.

Hosted SQL probes: anonymous workouts and training deliveries return zero rows. Guest sessions return zero rows for deliveries, workouts, programs, meals and instructor profiles. Local Postgres tests verify cross-account isolation, forbidden meal reassignment, guest/student/unassigned-professional assessment denial, injection-like values treated as data, preserved omitted measurements and same-day upsert.

Lovable quick scan rerun at 2026-11-22 10:10 UTC: **0 critical, 3 warnings, 4 informational**. No findings were ignored. Remaining warnings concern authenticated inserts in api_access_logs/fitpro_events and shared reads in referencias_planejamento; these need a separate scope review. Informational items include intentionally public subscription_plans (published prices/features), guest/auth policy coverage, leaked-password protection disabled and public avatar listing. Supabase advisors also report OTP expiry, available Postgres security updates, extensions in public and privileged RPC inventory. These are not represented as resolved by this change; no auth configuration or database engine upgrade was attempted.

## Interface and conversion

Hub has four visible pillar colors, wave areas, numeric hierarchy, selected-date/weekday controls, weekly totals and aligned chart points. Canonical numeric entries drive every update. Tested add/delete, keyboard dates, empty/loading/error, reduced motion and 320/390/768/1440 widths with synthetic browser API responses (no real user records written). Identity changes cannot show a previous athlete's ready chart.

Homepage focuses on the student. /sales contains professional NINE CORE access, with a separate link to student plans instead of student pricing. Student plan selection survives login and resumes checkout without selecting again. The signed-in account requirement and one-time billing remain accurate; guest payments and recurring billing were not introduced. No Meta billing, ads, budgets or campaigns were changed. There is no conversion experiment data to claim a measured increase.

Staff retains its real provider-owned interface. FitPro only styles the enclosing navigation/loading state.

## Verification

- TypeScript project build and Deno checks for the three repaired functions.
- 135 main-suite tests plus focused rhythm/checkout/offer tests.
- Existing payment, onboarding, identity, RLS and workspace Postgres regressions.
- Browser tests for real Hub components and actual public routes; screenshots generated locally.
- Production build and deployment/check results are verified separately after the GitHub push.
