# CLAUDE.md — Prismatic

Prismatic is an open source tool for running a large programme
transparently. One person types in the work (milestones, business goals,
features, estimates, delivery, risks) and gets the roadmap, the forecast
and a report for the steering group. Read this file at the start of every
session.

## Principles

- **A snapshot of best current knowledge.** The plan is expected to change;
  the product makes the change visible (report editions, "changes since
  last") rather than hiding it.
- **Easy to type in.** Faster than PowerPoint and Excel, or it has failed.
  A table for bulk work, a board for moving things.
- **The numbers are deterministic and explained.** Every figure in a
  report can be traced to what was typed in and a rule in `src/domain`.
- **Every programme is different.** Prefer a setting over a hard-coded
  choice when a real programme would want it.
- **Plain words.** The UI says "forretningsmål", never "epic".

## Domain rules (agreed with the product owner)

- Milestones M1..Mn are cumulative: M2 = M1 + what is planned for M2. A
  milestone's scope comes from its goals and can be overridden by hand.
  Milestones are placed on the roadmap by hand; a goal or feature of the
  milestone placed later than the milestone raises a warning.
- Sizes per programme, overridable per card. Defaults: feature XS–XL =
  20/40/60/100/150; business goal XS–XXL = 100/150/250/400/600/1000.
- The forecast takes a goal's estimate, never the goal plus its features.
  Done is the closed features with their own points. When the sum of a
  goal's features differs by the programme's deviation (default 10 %) or
  more from the goal's estimate, warn — never block.
- A feature can be split: the original closes with the points actually
  delivered and a note of what is done; the new version gets a new
  estimate and may belong to another goal or none.
- Done = status (planlagt, i gang, færdig) plus a closing quarter that
  defaults to the current one.
- A quarter's number is "leveret" once it has ended and "planlagt" before;
  both computed, overridable and resettable. Capacity is one percentage
  per quarter for the programme. Velocity = delivered ÷ capacity; low,
  average and high = the 3 lowest, all, the 3 highest of the last 5.
- Risks: probability and consequence 1–10, a 10×10 matrix, arrows for the
  change since the last edition.
- Periods: calendar, seasons (winter is "Vinter 2025/26", December to
  February) or a custom start; quarters near at hand, half-years further
  out, and a column "Endnu ikke planlagt".

## Architecture

- Next.js 16 (App Router), TypeScript strict, Tailwind 4, next-intl with
  Danish messages in `messages/da.json`. Never hardcode UI strings.
- Postgres 16 through node-postgres and Drizzle (ADR 0003). Migrations in
  `drizzle/`, applied by `scripts/migrate.mjs` as the owner; hand-written
  SQL for roles, RLS, audit triggers and `delete_account()`. The app
  connects as `prismatic_app` and runs programme work through
  `withUser()` in `src/db/client.ts`, so row-level security applies.
- `src/domain`: pure rules (periods, sizes, scope, forecast), fully tested.
  `src/services`: database work, each function taking a `Db`, tested
  against the Postgres test database (`tests/db.ts`). `src/actions`: server actions that
  validate with zod and call a service. `src/components`, `src/app`: UI.
- Accounts and sessions (ADR 0002, 0004): every service takes the acting
  user and reaches data only through a programme that user owns; server
  actions resolve the user in `src/actions/result.ts` before anything else.
  Two-step sign-in (TOTP, recovery codes) and passkeys live in
  `src/auth` and `src/services/factors.ts`.
- Every new table that holds programme data ships with `program_id`,
  forced RLS, an audit trigger, an entry in `delete_account()` if needed,
  and tests in `tests/ownership.test.ts` and `tests/isolation.test.ts`.
  The meta-test there fails a table without forced RLS. A new table also
  goes into the export (`src/services/export.ts`).
- Self-hosted: `docker-compose.yml` runs Postgres, the migrator and the
  app on one server (`docs/self-hosting.md`). No network calls of our own,
  no secrets in the code; `docs/subprocessors.md` lists who can see what
  and changes before any new third party does.

## Visual identity and UX

A tool, not a document. Every signed-in page sits in one frame: a fixed
sidebar with the programmes and, under the open one, its views (Overblik,
Roadmap, Backlog, Fremdrift, Risici, Rapport, Indstillinger), and a slim
sticky bar with where you are and the page's actions. Inside the frame,
each view is shaped for its own job: the overview answers first, the
roadmap shows the near quarters above the far half-years, the backlog is a
dense list, settings are rows with the label left and the control right.
Explanations go in hints and empty states, not above every block.

Paper #F7F6F3, white surfaces, ink #1F2D33, slate #5C6A6F, hairline
#DAD6CF, bronze #A88E6E used sparingly. Colour carries meaning: technical
blue #3B74AD and business ochre #A8742F; good, watch and bad in green
#4F7A5A, amber #B8862F and red #A8483F; the forecast tempi low, average and
high in red, blue and green, the same wherever they appear (`globals.css`).
Inter with tabular numerals, compact controls (32-36px). The numbered
bronze section label is kept for the steering-group report only. One
filled button per view.

## Ways of working

1. Plan first; get approval for anything that changes the domain rules.
2. Vertical slices; keep the app runnable at every commit.
3. Run `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm format` after
   changes and keep them green.
4. One responsibility per file; no file over roughly 300 lines.
5. Conventional commits. Significant decisions get an ADR in `docs/adr/`
   naming the trade-off accepted.
6. Code, comments and docs in English; UI copy in Danish.
7. Ask before adding a dependency or deleting files.
8. Never weaken RLS, the audit log or sign-in to make a feature easier.
