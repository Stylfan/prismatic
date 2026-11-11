import { getTranslations } from "next-intl/server";
import { currentUser } from "@/auth/session";
import { withUser } from "@/db/client";
import { exportWorkbook } from "@/lib/export-workbook";
import { PROGRAM_TABLES, exportAccount, type TableName } from "@/services/export";

/**
 * The one-click export: everything the signed-in account owns, as JSON or
 * as a spreadsheet. Nothing is stored; the file is built on request.
 */

export const dynamic = "force-dynamic";

const FORMATS = {
  json: "application/json; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ format: string }> }) {
  const { format } = await params;
  if (format !== "json" && format !== "xlsx") return new Response(null, { status: 404 });
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });

  const data = await withUser(user.id, (tx) => exportAccount(tx, user.id));
  const stamp = data.exportedAt.slice(0, 10);
  let body: string | ArrayBuffer;
  if (format === "json") {
    body = JSON.stringify(data, null, 2);
  } else {
    const t = await getTranslations("account.export");
    const names = ["programs", ...Object.keys(PROGRAM_TABLES)] as TableName[];
    const sheets = Object.fromEntries(names.map((n) => [n, t(`sheets.${n}`)])) as Record<
      TableName,
      string
    >;
    const bytes = exportWorkbook(data, { sheets, yes: t("yes"), no: t("no") });
    body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }
  return new Response(body, {
    headers: {
      "Content-Type": FORMATS[format],
      "Content-Disposition": `attachment; filename="prismatic-${stamp}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
