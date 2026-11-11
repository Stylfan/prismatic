# Security

Prismatic holds the plans, estimates, risks and decisions of large
programmes. A weakness in it matters, and we want to hear about it first.

## Reporting a vulnerability

Please report it privately, not in a public issue:

- Use GitHub's private vulnerability reporting on
  [Stylfan/prismatic](https://github.com/Stylfan/prismatic/security/advisories/new),
  or
- write to the maintainer through the contact form on
  [lenskjoldconsulting.dk](https://www.lenskjoldconsulting.dk).

Say what you found, how to reproduce it, and what an attacker could do
with it. You will get an answer within five working days. When the fix is
out, you are credited in the release notes unless you would rather not be.

Please do not test against an installation you do not run yourself, and do
not access or change data that is not yours.

## What is in scope

The code in this repository: the web application, its database schema and
migrations, the Docker images and the scripts that run them.

## How Prismatic protects data

- Every programme belongs to one account. The database itself enforces it:
  row-level security in Postgres hides other accounts' rows from the
  application's database role, and `tests/isolation.test.ts` proves it.
- Every change to a programme's data is written to an audit log that the
  application cannot change or delete, and neither can a database superuser
  without disabling the trigger first.
- Passwords are stored as scrypt hashes. Accounts can add two-factor login
  with an authenticator app and sign in with a passkey.
- Sessions are random tokens in an HttpOnly, SameSite=Lax cookie; only
  their SHA-256 is stored.
- There are no secrets in the code. CI scans every push for leaked secrets
  and audits the production dependencies for known vulnerabilities.
