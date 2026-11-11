# Running Prismatic on your own server

Prismatic runs on one server with Docker Compose: one Postgres, a
migration step and the app. It needs no cloud service and no outside key,
and once it is running it needs no internet at all. Prismatic uses no
language model.

## What you need

- A Linux server with Docker and the Compose plugin. 1 CPU and 1 GB of
  memory is enough for a handful of people.
- A domain name pointing at the server, and a reverse proxy that serves it
  over HTTPS (Caddy, nginx, or Coolify's built-in Traefik). Passkeys and
  secure cookies need HTTPS.
- To stay within Haij's fourth rule, an EU-owned provider on EU soil, for
  the server and for the backups. See [who can see what](subprocessors.md).

## First start

```bash
git clone https://github.com/Stylfan/prismatic.git && cd prismatic
cp .env.production.example .env.production
```

Fill in `.env.production`. Make each of the three secrets with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
or `openssl rand -base64 32`, and set `PRISMATIC_URL` to the public
address. Then:

```bash
docker compose --env-file .env.production up -d --build
```

Compose starts Postgres, waits for it, runs the migrations (which also set
the application role's password), and starts the app on `127.0.0.1:3000`.
Point the reverse proxy at that port. With Caddy, the whole configuration
is:

```
prismatic.example.dk {
  reverse_proxy 127.0.0.1:3000
}
```

Open the address. The first person to sign up gets the first account;
sign-up then closes unless `PRISMATIC_SIGNUP=open`. Turn on two-step
sign-in or add a passkey under **Konto**.

## Backups

Everything lives in the `pgdata` volume. Back it up with `pg_dump`, for
example nightly from cron, and keep the copies somewhere other than the
server:

```bash
docker compose --env-file .env.production exec -T db \
  pg_dump -U postgres -Fc prismatic > prismatic-$(date +%F).dump
```

Keep `.env.production` with the backups. Without `PRISMATIC_SECRET`, codes
from authenticator apps no longer work (recovery codes and passkeys do).
To restore, start an empty `db`, then
`pg_restore -U postgres -d prismatic --clean --if-exists` the dump, and
start the rest.

## Updating

```bash
git pull
docker compose --env-file .env.production up -d --build
```

The migration step runs on every start and applies what is new.

## The offline test

Haij's second rule: cut the internet, and everything essential still
works. Prismatic makes no network calls of its own: the typeface ships
with the code, there is no analytics, no telemetry (the image sets
`NEXT_TELEMETRY_DISABLED=1`), no AI provider and no mail. Only building
the image needs the internet, to fetch the packages.

## Your data

Every account can download everything it owns as a spreadsheet or as
JSON under **Konto**, and delete itself with everything it owns, the audit
log of its programmes included. Steering-group reports save as PDF from
the report page.

## Running it on your own machine instead

The README describes running it locally for development, with Postgres in
Docker and the app on the host.
