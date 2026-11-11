# ADR 0002: Accounts, sessions and programme ownership

Status: accepted, two-step sign-in and passkeys added by ADR 0004 · Date: 2026-11-10 · Revises ADR 0001 ("no login")

## Context

ADR 0001 kept Prismatic local with no login. The product owner wants
each user to see only the programmes they made, and accounts are the
precondition for hosting it and sharing a report later.

## The decision

- **Accounts with e-mail and password.** Passwords are hashed with scrypt
  from Node's own crypto (N=16384, r=8, p=1, 16-byte salt) and compared in
  constant time. The stored form names its parameters so they can be raised
  later. No dependency is added.
- **Sessions** are 32 random bytes in an HttpOnly, SameSite=Lax cookie,
  Secure in production, valid for 30 days. Only the SHA-256 of the token
  is stored, so a copy of the database holds no working session.
- **Ownership.** A programme has an owner. Every service takes the acting
  user and reaches milestones and items only through a programme that user
  owns; anything else throws NotFound, exactly as if it did not exist. All
  server actions go through one helper that resolves the user first, so no
  action can skip the check. Tests prove a second user can neither read nor
  change another's programme, sizes, milestones or items.
- **Sign-up** is open for the first account, which takes over programmes
  made before accounts existed; it then closes unless `PRISMATIC_SIGNUP=open`.
- **Sign-in attempts** are limited per e-mail in memory (8 per 15 minutes),
  and a failure says the same thing whether the address exists or not.

## Trade-offs accepted

- **No passkeys or two-factor yet.** A password is the smallest thing that
  works for one person on their own machine; both belong before hosting.
- **The attempt limit lives in memory.** Prismatic runs as one process; a
  restart resets the count.
- **No password reset by mail.** There is no mail in Prismatic. Whoever runs
  the installation can reset an account in the database.
