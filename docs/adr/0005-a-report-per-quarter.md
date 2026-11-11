# ADR 0005: A report belongs to a quarter

Status: accepted · Date: 2026-11-11

## Context

The programme works in quarters. Each quarter starts with a plan and its
goals; when it ends, the steering group gets a quarterly report that says
what was reached, what was not, and what was learned. Until now the report
had one set of texts for the whole programme and a separate choice of
"which quarter's goals to show", so the words and the goals could belong
to different quarters, and last quarter's update was overwritten by this
one's.

## The decision

- **The quarter is chosen once, at the top of the report page**, and
  everything follows it: the short update, the explanation of the changes,
  the goals, the preview and what is published. It is carried in the
  address (`?q=`), so a link opens the same quarter. The default is the
  quarter under way, the one the next report closes.
- **The texts are kept per quarter.** `report_drafts` loses its primary key
  on the programme and gets a `quarter_index`, unique together with the
  programme. A draft that named the quarter whose goals it showed moves to
  that quarter in the migration. One that did not keeps no quarter and is
  shown under the quarter opened first, until a quarter saves it; nothing
  is deleted.
- **A published edition records its quarter** in its frozen data and is
  named for it by default ("Kvartalsrapport for Efterår 2026"). Editions
  from before keep reading as they were; the quarter is optional in the data.
- **The change control still compares with the latest edition**, whatever
  its quarter: what the steering group saw last is what "since last" means.

## The trade-off accepted

`goals_quarter` stays in the table, unused, rather than being dropped in
the same migration. The legacy row without a quarter is a small special
case in `getDraft` and `saveDraft` that lives until every programme has
saved once. Both buy a migration that never loses words someone wrote.
