# Who can see what

Prismatic is software you run yourself. This page lists every third party
that can see the data in an installation, so you can check that nothing
leaves the places you chose.

## The software itself: nobody

Prismatic sends nothing anywhere. It makes no network calls of its own: no
analytics, no telemetry, no error reporting, no fonts or scripts from a
CDN (the typeface is part of the repository), no AI provider. Everything a
programme contains lives in its own Postgres database. Pull the network
cable and every feature keeps working.

Next.js, which Prismatic is built on, can collect anonymous telemetry when
it builds or runs the development server. The Docker image switches it off
(`NEXT_TELEMETRY_DISABLED=1`); on your own machine, run
`pnpm exec next telemetry disable` once.

## Where you run it: whoever you choose

| Who                   | What they can see                                      | When                                                                                                          |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Your own machine      | Everything                                             | Run locally, as the README describes                                                                          |
| Your hosting provider | Everything stored on the server, and the traffic to it | When you run Prismatic on a server. Choose an EU-owned provider on EU soil to stay within Haij's fourth rule. |
| Your backup storage   | The database backups                                   | If you back up off the server ([docs/self-hosting.md](self-hosting.md))                                       |

## Passkeys and authenticator apps: on your own devices

A passkey's private key stays with the device or password manager that
made it (for example iCloud Keychain, Google Password Manager, Windows Hello
or 1Password), and so does the secret in an authenticator app. They hold
the key to an account, never a programme's data, and Prismatic never sends
them anything: the browser talks to them directly.

## The code: GitHub

The source code is hosted on GitHub, which is owned by Microsoft in the
United States. GitHub hosts code, never the data of an installation.

## Changes

A new third party appears on this page before it appears in the software.
