# Migration Run Order

Run each file in the Supabase SQL Editor in this exact order:

1. `001_enums.sql` — all custom enum types
2. `002_core_tables.sql` — contributors, fonts, buyers
3. `003_transactional_tables.sql` — licenses, cases, activity log, payouts
4. `004_users_and_rls.sql` — users table, RLS policies, auth trigger
5. `005_functions_and_triggers.sql` — business logic, financial auto-calc, fuzzy search
6. `006_seed_data.sql` — 6 contributors and 9 fonts (run once only)

## After running all migrations

Promote the first admin user. In the SQL Editor:

```sql
-- Replace with the UUID shown in Authentication → Users in your Supabase dashboard
UPDATE users SET role = 'admin' WHERE id = 'YOUR-USER-UUID-HERE';
```

Or use this snippet that targets by email:

```sql
UPDATE users
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your@email.com'
);
```
