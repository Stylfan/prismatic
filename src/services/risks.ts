import { and, asc, eq, max } from "drizzle-orm";
import type { Db } from "@/db/client";
import { programs, risks, type Risk, type RiskStatus } from "@/db/schema";
import { NotFound, requireProgram } from "./programs";

/** The programme's risk log. Every risk is reached through a programme the acting user owns. */

export function listRisks(db: Db, programId: string): Risk[] {
  return db
    .select()
    .from(risks)
    .where(eq(risks.programId, programId))
    .orderBy(asc(risks.number))
    .all();
}

function requireRisk(db: Db, userId: string, riskId: string): Risk {
  const row = db
    .select({ risk: risks })
    .from(risks)
    .innerJoin(programs, eq(programs.id, risks.programId))
    .where(and(eq(risks.id, riskId), eq(programs.ownerId, userId)))
    .get();
  if (!row) throw new NotFound();
  return row.risk;
}

export function addRisk(
  db: Db,
  userId: string,
  input: { programId: string; title: string },
): string {
  requireProgram(db, userId, input.programId);
  const last = db
    .select({ max: max(risks.number) })
    .from(risks)
    .where(eq(risks.programId, input.programId))
    .get();
  db.insert(risks)
    .values({ programId: input.programId, title: input.title, number: (last?.max ?? 0) + 1 })
    .run();
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

export function updateRisk(db: Db, userId: string, input: RiskInput): string {
  const row = requireRisk(db, userId, input.riskId);
  const { riskId, ...fields } = input;
  db.update(risks).set(fields).where(eq(risks.id, riskId)).run();
  return row.programId;
}

export function deleteRisk(db: Db, userId: string, riskId: string): string {
  const row = requireRisk(db, userId, riskId);
  db.delete(risks).where(eq(risks.id, row.id)).run();
  return row.programId;
}
