# ADR 0003: Postgres with row-level security and an append-only audit log

Status: accepted · Date: 2026-11-11 · Supersedes the SQLite part of ADR 0001

## Context

Prismatic is to live up to the Haij family's rules, among them: it runs on
one server with Docker Compose and Postgres (rule 2), every account can
take its data out and delete it completely (rule 3), and the database
itself separates the accounts, with a test proving it, and keeps an audit
log nobody can edit (rule 6). SQLite has no roles and no row-level
security, so ownership lived only in the services (ADR 0002). One missed
check in one service would have shown one account another's programme.

## The decision

- **Postgres 16 through node-postgres and Drizzle.** Migrations in
  `drizzle/`, applied by `scripts/migrate.mjs` as the database owner. The
  script is plain JavaScript so the production migrator needs only
  production dependencies.
- **Two roles.** The owner runs migrations. The application connects as
  `prismatic_app`, which owns nothing; its LOGIN and password are set by
  the migration script from `PRISMATIC_APP_PASSWORD`, not by a Postgres init
  script (an init script runs only on an empty data directory and fails
  silently, which is how Ajour's first deployment went wrong).
- **Row-level security, forced, on every table that holds programme data.**
  `withUser()` opens a transaction and sets `app.user_id` for it alone;
  the policy on `programs` lets an account see and write only its own, and
  every other table reaches its rows through `programs`. The services keep
  their own ownership checks: two locks, either enough on its own.
- **An audit log written by triggers.** Every insert, update and delete on
  the twelve programme tables is recorded with the acting account, the row
  before and after. The application role may read the log for its own
  programmes and nothing else. A trigger refuses UPDATE, DELETE and
  TRUNCATE for every role, the owner included.
- **One way to erase.** `delete_account()` is a SECURITY DEFINER function
  that only the account itself may call. It deletes the programmes (the
  foreign keys take the rest), then, with a flag only it sets, the audit
  rows of those programmes, then the account. Leaving leaves nothing.
- **Tests on a real Postgres.** `tests/global-setup.ts` creates and
  migrates `prismatic_test`. `tests/isolation.test.ts` connects as the
  application role and goes around the services with raw SQL to prove the
  policies, the audit log's immutability and the deletion. A meta-test
  fails any new table that holds programme data without forced RLS.

## Trade-offs accepted

- **No more one-file database.** Running Prismatic now needs Docker (or a
  Postgres) even on one's own machine: `pnpm db:up` starts one. The
  SQLite files in `data/` are not migrated automatically.
- **Accounts and sign-in tables sit outside RLS.** Nobody is known to be
  signed in while a password or passkey is checked, so `users`,
  `sessions`, `passkeys`, `recovery_codes` and `auth_challenges` are reached
  only through `src/services/users.ts` and `src/services/factors.ts`. They
  are not audited either, so no hash or secret is copied into the log.
- **The audit log can be erased by deleting the account.** Rule 3 (delete
  completely) and rule 6 (an uneditable log) pull in opposite directions;
  the log is immutable for as long as the account exists.
- **A superuser can still disable a trigger.** The log protects against
  the application and against mistakes, not against whoever owns the
  server. That is the nature of running your own.
- **Tests run one file at a time** against one shared test database,
  emptied before each test. Slower than parallel, and simple.
