# D1 Migration Order

Apply migrations in the order below for a fresh database. The filenames are not perfectly zero-padded because early migrations predate the current naming convention, so use this list as the source of truth until the history is consolidated.

1. `migrations/0001_schema.sql`
2. `migrations/003_create_scopes_table.sql`
3. `migrations/004_create_comments_table.sql`
4. `migrations/0005_hall_of_fame.sql`
5. `migrations/0006_response_templates.sql`
6. `migrations/0007_remove_stored_names.sql`
7. `migrations/0008_add_title_disclosed.sql`
8. `migrations/0009_add_internal_flags.sql`
9. `migrations/0010_convert_assigned_to_user_ids.sql`
10. `migrations/0011_support_user_audit_logs.sql`

Run data maintenance scripts only after the schema migrations they depend on:

- `migrations/backfill_hall_of_fame.sql`
- `migrations/redact_existing_pii.sql`

When adding new migrations, use four-digit zero-padded prefixes starting at `0011_` and keep Drizzle definitions in `lib/db/schema.ts` aligned with the resulting schema.
