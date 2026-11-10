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
- SQLite through better-sqlite3 and Drizzle. One file, `data/prismatic.db`
  (or `PRISMATIC_DB`); migrations in `drizzle/` run on open.
- `src/domain`: pure rules (periods, sizes, scope, forecast), fully tested.
  `src/services`: database work, each function taking a `Db`, tested
  against an in-memory database. `src/actions`: server actions that
  validate with zod and call a service. `src/components`, `src/app`: UI.
- Accounts and sessions (ADR 0002): every service takes the acting user
  and reaches data only through a programme that user owns; server actions
  resolve the user in `src/actions/result.ts` before anything else. A new
  table or service ships with an ownership test in `tests/ownership.test.ts`.
- Local first: the server binds to 127.0.0.1. Hosting and share links come
  later.

## Visual identity

Paper #F7F6F3, white surfaces, ink #1F2D33, slate #5C6A6F, hairline
#DAD6CF, bronze #A88E6E used sparingly; technical track #4A6B7A, business
track #C9B9A3; status green #4F7A5A, amber #B8862F, red #A8483F. Inter
with tabular numerals. Section labels are bold, letter-spaced capitals in
bronze ("01 · OVERBLIK"). No shadows; hairlines carry the structure. One
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
