# ADR 0001: A local-first tool on SQLite, started from parts of Ajour

Status: accepted · Date: 2026-11-10

## Context

The steering-group material for a large programme (quarter report,
roadmap, forecast, risk log) has been made by hand in PowerPoint and
Excel. The data comes from the teams, but what the material needs —
milestones, business goals, estimates, capacity, risks — does not exist
in DevOps or Jira in that form. A first attempt bent Ajour, a planning
tool for small projects with dated tasks, toward this; it fought the job.

## The decision

A new product, Prismatic, for one programme manager:

- **You type it in.** No integration in the first versions; CSV, DevOps
  or Jira import can come later.
- **SQLite in one file.** Anyone can clone and run it with `pnpm install`
  and `pnpm dev`, without Docker or a database server. Backup is a copy.
- **Several programmes per installation.**
- **Local first.** Bound to 127.0.0.1 with no login; the report is printed
  or saved as PDF. A hosted mode with login and share links comes later.
- **Parts of Ajour reused** under its AGPL-3.0 licence: the Next.js and
  Tailwind set-up, the period arithmetic, sizes and cumulative milestone
  scope, and their tests. Not its branding, auth, tenancy or AI.

## Trade-offs accepted

- **No login means no hosting yet.** Running it on a shared server as it
  is would expose every programme; that is why it binds to 127.0.0.1.
- **SQLite has one writer.** Fine for one person; a team product would
  need Postgres, and Drizzle keeps that move small.
- **AGPL-3.0 is inherited.** Code that started in Ajour keeps its licence,
  so Prismatic is AGPL-3.0 too.
