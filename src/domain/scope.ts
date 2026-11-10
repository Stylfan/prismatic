/**
 * Milestones build on each other (docs/adr/0001): M2's scope is M1's plus
 * what is planned for M2. A milestone's own scope is typed by hand when it
 * has an override, otherwise computed from what is planned for it.
 */

export type MilestoneScopeInput = {
  id: string;
  seq: number;
  scopeOverride: number | null;
  /** Points planned for this milestone alone, from its goals (slice 2). */
  computed: number;
};

export type MilestoneScope = {
  id: string;
  seq: number;
  /** This milestone's own points. */
  own: number;
  /** Whether `own` is the hand-typed override. */
  overridden: boolean;
  /** Its own points plus every earlier milestone's: the threshold the forecast has to pass. */
  cumulative: number;
};

export function cumulativeScopes(milestones: MilestoneScopeInput[]): MilestoneScope[] {
  let running = 0;
  return [...milestones]
    .sort((a, b) => a.seq - b.seq)
    .map((m) => {
      const overridden = m.scopeOverride !== null;
      const own = overridden ? m.scopeOverride! : m.computed;
      running += own;
      return { id: m.id, seq: m.seq, own, overridden, cumulative: running };
    });
}
