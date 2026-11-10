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

- Several programmes in one installation.
- Per programme: a period model (calendar quarters, the seasons with autumn
  from 1 September, or quarters from a start date of your own), how many
  quarters are shown before the roadmap switches to half-years, a cost per
  quarter and the deviation at which a goal's breakdown is flagged.
- Sizes and points for business goals (XS–XXL) and features (XS–XL).
- Milestones M1, M2, … that build on each other.

Next: the backlog of business goals and features, the drag-and-drop
roadmap, the forecast, the risk log and report editions for each steering
group meeting. [docs/adr](docs/adr/) records the decisions.

## Run it

Requirements: Node 22 or newer and pnpm 10.

```bash
git clone https://github.com/Stylfan/prismatic.git && cd prismatic
pnpm install
pnpm dev        # http://127.0.0.1:3000
```

Everything you type in is stored in one SQLite file, `data/prismatic.db`,
created on first start. Back it up by copying it. Set `PRISMATIC_DB` to
keep it somewhere else. The app listens on 127.0.0.1 only and has no login
yet: it is meant to run on your own machine.

```bash
pnpm test && pnpm lint && pnpm typecheck
```

## Licence and credits

AGPL-3.0. Parts of the code began in [Ajour](https://github.com/MartinNymannVinther/ajour)
by Martin Nymann Vinther (AGPL-3.0); the period arithmetic and forecast
rules were first written there. Built together with Claude Code.
