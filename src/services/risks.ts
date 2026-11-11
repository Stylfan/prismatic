import { and, asc, eq, max } from "drizzle-orm";
import type { Db } from "@/db/client";
import { programs, risks, type Risk, type RiskStatus } from "@/db/schema";
import { NotFound, requireProgram } from "./programs";

/** The programme's risk log. Every risk is reached through a programme the acting user owns. */

export async function listRisks(db: Db, programId: string): Promise<Risk[]> {
  return await db
    .select()
    .from(risks)
    .where(eq(risks.programId, programId))
    .orderBy(asc(risks.number));
}

async function requireRisk(db: Db, userId: string, riskId: string): Promise<Risk> {
  const [row] = await db
    .select({ risk: risks })
    .from(risks)
    .innerJoin(programs, eq(programs.id, risks.programId))
    .where(and(eq(risks.id, riskId), eq(programs.ownerId, userId)));
  if (!row) throw new NotFound();
  return row.risk;
}

export async function addRisk(
  db: Db,
  userId: string,
  input: { programId: string; title: string; consequence?: string; mitigation?: string },
): Promise<string> {
  await requireProgram(db, userId, input.programId);
  const [last] = await db
    .select({ max: max(risks.number) })
    .from(risks)
    .where(eq(risks.programId, input.programId));
  await db.insert(risks).values({
    programId: input.programId,
    title: input.title,
    consequence: input.consequence ?? "",
    mitigation: input.mitigation ?? "",
    number: (last?.max ?? 0) + 1,
  });
  return input.programId;
}

export type RiskInput = {
  riskId: string;
  title: string;
  consequence: string;
  mitigation: string;
  changeNote: string;
  probability: number;
  impact: number;
  status: RiskStatus;
};

export async function updateRisk(db: Db, userId: string, input: RiskInput): Promise<string> {
  const row = await requireRisk(db, userId, input.riskId);
  const { riskId, ...fields } = input;
  await db.update(risks).set(fields).where(eq(risks.id, riskId));
  return row.programId;
}

export async function deleteRisk(db: Db, userId: string, riskId: string): Promise<string> {
  const row = await requireRisk(db, userId, riskId);
  await db.delete(risks).where(eq(risks.id, row.id));
  return row.programId;
}
