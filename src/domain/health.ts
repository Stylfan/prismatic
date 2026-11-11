/**
 * The programme's colour on the overview, worked out from what the data
 * already says, never typed in: red when a quarter is planned beyond what
 * the tempo can carry or a risk is in the high band, amber when the backlog
 * has warnings or a milestone slips past where it is placed, green
 * otherwise. The reasons come with it, so the colour can be explained.
 */

export type Health = "good" | "watch" | "bad";

export type HealthSignals = {
  /** Columns planned beyond 100 % of what the average tempo delivers. */
  overloaded: number;
  highRisks: number;
  warnings: number;
  /** Milestones whose average forecast lands after the column they are placed in. */
  slipping: number;
};

export function programHealth(s: HealthSignals): Health {
  if (s.overloaded > 0 || s.highRisks > 0) return "bad";
  if (s.warnings > 0 || s.slipping > 0) return "watch";
  return "good";
}
