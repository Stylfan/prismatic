import type { Size, SizeLevel } from "@/db/schema";

/**
 * Sizes and their points (docs/adr/0001). Each program keeps its own
 * table per level; these are the defaults a new program starts with.
 * A feature goes up to XL, a business goal up to XXL.
 */

export const LEVEL_SIZES: Record<SizeLevel, readonly Size[]> = {
  feature: ["XS", "S", "M", "L", "XL"],
  goal: ["XS", "S", "M", "L", "XL", "XXL"],
};

export const DEFAULT_POINTS: Record<SizeLevel, Partial<Record<Size, number>>> = {
  feature: { XS: 20, S: 40, M: 60, L: 100, XL: 150 },
  goal: { XS: 100, S: 150, M: 250, L: 400, XL: 600, XXL: 1000 },
};

export const MAX_POINTS = 100_000;

export type SizeTable = Record<SizeLevel, Partial<Record<Size, number>>>;

export function defaultSizeRows(): Array<{ level: SizeLevel; size: Size; points: number }> {
  return (Object.keys(LEVEL_SIZES) as SizeLevel[]).flatMap((level) =>
    LEVEL_SIZES[level].map((size) => ({ level, size, points: DEFAULT_POINTS[level][size]! })),
  );
}

export function isSizeForLevel(level: SizeLevel, size: string): size is Size {
  return (LEVEL_SIZES[level] as readonly string[]).includes(size);
}

/**
 * A card's points: its own override when it has one, otherwise what its
 * size is worth in this program, otherwise null (not estimated).
 */
export function resolvePoints(
  table: SizeTable,
  level: SizeLevel,
  size: Size | null,
  override: number | null,
): number | null {
  if (override !== null) return override;
  if (size === null || !isSizeForLevel(level, size)) return null;
  return table[level][size] ?? null;
}
