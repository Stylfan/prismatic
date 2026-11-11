import type { AccountExport, TableName } from "@/services/export";
import { buildWorkbook, type CellValue, type Sheet } from "./xlsx";

/**
 * The export as a spreadsheet: one sheet per table, one row per database
 * row, the column names as the database has them. Times become real dates
 * a spreadsheet can sort; nested values (a frozen edition, an audit row's
 * before and after) are written as JSON text, cut to what one cell holds.
 * The JSON export carries everything whole.
 */

// Excel's limit for the text in one cell.
const CELL_LIMIT = 32_767;

function cell(key: string, value: unknown, yes: string, no: string): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return /At$/.test(key) ? new Date(value) : value;
  if (typeof value === "boolean") return value ? yes : no;
  if (typeof value === "string") return value.slice(0, CELL_LIMIT);
  return JSON.stringify(value).slice(0, CELL_LIMIT);
}

function sheet(name: string, rows: Record<string, unknown>[], yes: string, no: string): Sheet {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return {
    name,
    columns: keys.map((k) => ({ header: k, width: Math.min(40, Math.max(12, k.length + 2)) })),
    rows: rows.map((r) => keys.map((k) => cell(k, r[k], yes, no))),
  };
}

export function exportWorkbook(
  data: AccountExport,
  labels: { sheets: Record<TableName, string>; yes: string; no: string },
): Buffer {
  const { yes, no } = labels;
  return buildWorkbook([
    sheet(labels.sheets.programs, data.programs, yes, no),
    ...(Object.keys(data.tables) as (keyof AccountExport["tables"])[]).map((name) =>
      sheet(labels.sheets[name], data.tables[name], yes, no),
    ),
  ]);
}
