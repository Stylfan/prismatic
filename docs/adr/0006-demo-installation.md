# ADR 0006: A demo installation

Status: accepted · Date: 2026-11-11

## Context

Prismatic is to be shown on its maker's website so people can try it and,
if they like it, fetch the code and run it themselves. Hosting real
accounts for strangers means holding their data for as long as they stay,
with the duties that come with it. A demo that forgets everything after a
day needs none of that, as long as it never asks for anything personal.

## The decision

- **`PRISMATIC_DEMO=on` makes an installation a demo.** Its front door is
  one button, "Start demoen". It takes no sign-ups at all, also not the
  first account; the sign-in form is still there, folded away, for an
  account made before the switch.
- **A visit is a throwaway account.** It gets an address under
  `demo.invalid` and a random password that nobody is told, a
  `demo_expires_at` 24 hours ahead, its own copy of the example programme
  and a session. A visit cannot sign in with a password, and its session
  stops working the moment its time is up, even before the cleanup runs.
- **The cleanup is the account deletion that exists.** Expired visits are
  deleted one by one through `delete_account()`, inside `withUser()` for
  that visit, so the application role does it and the audit rows of their
  programmes go with them, as when a person deletes their own account. It
  runs when a visit starts and at most every ten minutes while anyone uses
  the app; no separate scheduler is needed. A visitor can also end the
  visit at once from Konto.
- **Limits:** at most 300 visits at once, and a few starts per address per
  quarter of an hour, so a demo server cannot be filled up.
- **Every page of a visit says it is a demo**, when it is deleted, not to
  type real data, and where to get the code (`PRISMATIC_SOURCE_URL`,
  defaulting to the GitHub repository, as AGPL asks of a network service).
  With an operator named, the privacy policy and terms are short demo
  versions.

## The trade-off accepted

The cleanup piggybacks on traffic: a visit whose time is up stays in the
database until someone next uses the demo, though it can no longer be
opened. That spares a scheduler process and keeps the one-server setup.
The visit is a real row in `users`, which keeps every other part of the
app unchanged at the cost of one nullable column.
