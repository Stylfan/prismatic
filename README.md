# Prismatic

Prismatic makes it easy to keep a large programme transparent: what has
been delivered, what the plan is right now, when each milestone looks
likely to be reached, and which risks are on the way. It is a snapshot of
the best current knowledge, not a plan cut in stone, and it is built to
show how that knowledge changes over time.

You type in the work as it is understood today: milestones, the business
goals ("forretningsmål") that lead to them, and the features that break
the goals down, each with a T-shirt size and points. From that, Prismatic
works out the roadmap in quarters and half-years, the forecast from what
has actually been delivered, and the material a steering group needs.

The interface is in Danish.

## Status

Early. What works today:

- Accounts with e-mail and password, two-step sign-in with an
  authenticator app (and recovery codes), and passkeys. Each user sees
  only the programmes they made, and the database itself enforces it.
- Under **Konto**: download everything you own as a spreadsheet or as JSON,
  and delete your account with everything in it.
- Several programmes in one installation.
- Per programme: a period model (calendar quarters, or the seasons with
  autumn from 1 September), a start date, how many quarters the near horizon
  shows (1-4) before three half-years, a cost per quarter and the deviation
  at which a goal's breakdown is flagged.
- Sizes and points for business goals (XS–XXL) and features (XS–XL).
- Milestones M1, M2, … that build on each other, their scope computed from
  the business goals planned for them and overridable by hand.
- A backlog of business goals and features: link features to goals and
  goals to milestones, give them a size or points, a track (business or
  technical), a period, a status and the quarter they closed in, mark big
  integrations, and split a partly done feature into a new version.
  Warnings show what does not hang together: a feature without a goal, a
  goal without a milestone, a card without an estimate, and a goal whose
  features differ from its estimate by the programme's threshold.

- A roadmap board: near quarters, three half-years and "Endnu ikke planlagt",
  cards and milestones dragged between columns (or moved from a list), the
  planned points per column, events in a quarter, a warning when a
  milestone has work planned after it, and the delivered work by quarter.

- Fremdrift: a quarter ledger with capacity and delivered or planned points
  (computed from the backlog, typed over when needed), the three tempi from
  the last five quarters, when each milestone is reached in each tempo and
  at what price, and a chart. The arithmetic reproduces the programme's own
  spreadsheet; `tests/forecast.test.ts` checks it against its numbers.

- Risici: a numbered risk log (risk, consequence, mitigation, change since
  last, probability and consequence 1-10, open or closed) and a 10 x 10 matrix.

- A report for the steering group: status and key figures, the quarter's
  goals with sub-goals and stretch goals, cases for decision, the roadmap,
  change control, the forecast, the risks and the decision log. "Udgiv
  udgave" freezes an edition; the next one shows what changed since: moved,
  added, re-estimated and closed cards (starred on the roadmap), risks that
  moved (arrows in the matrix) or are new ("NY"), and shifted forecasts. It
  prints, or saves as PDF, in A4 landscape.

Next: a share link for the steering group, import from Excel, CSV, DevOps
or Jira, and an English interface.

## Run it on your own machine

Requirements: Node 22 or newer, pnpm 10 and Docker (for Postgres).

```bash
git clone https://github.com/Stylfan/prismatic.git && cd prismatic
pnpm install
cp .env.example .env    # then set PRISMATIC_SECRET, see the file
pnpm db:up              # Postgres in Docker on 127.0.0.1:5433
pnpm db:migrate
pnpm dev                # http://127.0.0.1:3000
```

The first person to open the app creates the first account. Sign-up then
closes; set `PRISMATIC_SIGNUP=open` to let more people create accounts.

```bash
pnpm test && pnpm lint && pnpm typecheck
```

The tests create and migrate their own database, `prismatic_test`, next to
the development one.

## Run it on a server

One server, Docker Compose, Postgres, no cloud keys:
[docs/self-hosting.md](docs/self-hosting.md).

## The rules it lives by

Prismatic follows the seven rules the [Haij](https://haij.dk) tools are
built by.

| Rule                              | How Prismatic meets it                                                                                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 Real open source                | AGPL-3.0. What runs anywhere is this repository, nothing more.                                                                                                                                                                                                                 |
| 2 Self-hosting                    | Docker Compose with one Postgres on one server; no cloud key, no network calls of its own, so it works offline. No language model is used.                                                                                                                                     |
| 3 Your data, always               | One-click export as spreadsheet or JSON (reports as PDF), and complete deletion of the account and everything it owns.                                                                                                                                                         |
| 4 EU or self-hosted               | [Who can see what](docs/subprocessors.md): nobody but the hosting you choose.                                                                                                                                                                                                  |
| 5 The AI helps, the human decides | There is no AI in Prismatic; every number comes from what was typed in and a rule in `src/domain`.                                                                                                                                                                             |
| 6 Secure from day one             | Row-level security in Postgres with a test proving it (`tests/isolation.test.ts`), an audit log no role can edit, passkeys and two-step sign-in, [SECURITY.md](SECURITY.md) for reporting, secrets only in the environment, CI that scans for secrets and audits dependencies. |
| 7 Used for real                   | Built from real use on a programme at a customer.                                                                                                                                                                                                                              |

Decisions and the trade-offs behind them are in [docs/adr](docs/adr).

## Licence and credits

AGPL-3.0. Parts of the code began in [Ajour](https://github.com/MartinNymannVinther/ajour)
by Martin Nymann Vinther (AGPL-3.0); the period arithmetic and forecast
rules were first written there. Built together with Claude Code.
