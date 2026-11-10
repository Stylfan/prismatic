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

- Accounts with e-mail and password. Each user sees only the programmes
  they made.
- Several programmes in one installation.
- Per programme: a period model (calendar quarters, the seasons with autumn
  from 1 September, or quarters from a start date of your own), how many
  quarters are shown before the roadmap switches to half-years, a cost per
  quarter and the deviation at which a goal's breakdown is flagged.
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

Next: the drag-and-drop roadmap, the forecast, the risk log and report
editions for each steering group meeting. [docs/adr](docs/adr/) records the decisions.

## Run it

Requirements: Node 22 or newer and pnpm 10.

```bash
git clone https://github.com/Stylfan/prismatic.git && cd prismatic
pnpm install
pnpm dev        # http://127.0.0.1:3000
```

Everything you type in is stored in one SQLite file, `data/prismatic.db`,
created on first start. Back it up by copying it. Set `PRISMATIC_DB` to
keep it somewhere else.

The first person to open the app creates the first account, and any
programme already in the database becomes theirs. Sign-up then closes; set
`PRISMATIC_SIGNUP=open` to let more people create accounts. The app listens
on 127.0.0.1 only: it is meant to run on your own machine until hosting is
in place.

```bash
pnpm test && pnpm lint && pnpm typecheck
```

## Licence and credits

AGPL-3.0. Parts of the code began in [Ajour](https://github.com/MartinNymannVinther/ajour)
by Martin Nymann Vinther (AGPL-3.0); the period arithmetic and forecast
rules were first written there. Built together with Claude Code.
