# Migration source references

These are the original repository scripts retained for isolated regression tests. They are not deployed.

The active `supabase/migrations` directory now reproduces the 590 original versions and SQL statements recorded in `supabase_migrations.schema_migrations` on project `mfrydtrzjxscbkaiwfnw` (2026-11-21). The previous files often used authoring timestamps instead of the server-assigned applied versions, which broke Supabase Preview. `remote-history.json` records versions and SHA-256 hashes of the restored scripts. No remote history was deleted, relabeled, or marked applied, and historical SQL is not replayed in production.

Three subsequent security migrations are also included with their server-assigned versions.

New changes must be generated with the Supabase CLI and kept in the active migration directory. Regression fixtures can refer to this directory when testing an earlier contract.
