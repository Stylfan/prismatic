/**
 * Risk scoring (CLAUDE.md, domain rules): probability and consequence from
 * 1 to 10, a score of their product, and three bands for the colours of the
 * matrix. The bands are this product's convention, not a standard.
 */

export const SCALE = 10;

export type RiskBand = "low" | "medium" | "high";

export function riskScore(probability: number, impact: number): number {
  return probability * impact;
}

export function riskBand(probability: number, impact: number): RiskBand {
  const score = riskScore(probability, impact);
  if (score > 50) return "high";
  if (score > 20) return "medium";
  return "low";
}

/** The most serious first, ties by number. */
export function byScore<T extends { probability: number; impact: number; number: number }>(
  list: T[],
): T[] {
  return [...list].sort(
    (a, b) =>
      riskScore(b.probability, b.impact) - riskScore(a.probability, a.impact) ||
      a.number - b.number,
  );
}
