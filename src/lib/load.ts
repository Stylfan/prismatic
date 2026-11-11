import { requireUser } from "@/auth/session";
import { withUser, type Tx } from "@/db/client";
import { getProgram, type ProgramFull } from "@/services/programs";

/**
 * What every programme page does first: the signed-in user, then the
 * programme and whatever else the page needs, read in one transaction in
 * which the database knows who is asking. A programme that is not the
 * user's comes back as null, exactly like one that does not exist.
 */
export async function withProgram<T extends object>(
  programId: string,
  fn: (tx: Tx, full: ProgramFull, userId: string) => Promise<T>,
): Promise<(T & { full: ProgramFull; userId: string }) | null> {
  const user = await requireUser();
  return withUser(user.id, async (tx) => {
    const full = await getProgram(tx, user.id, programId);
    if (!full) return null;
    return { ...(await fn(tx, full, user.id)), full, userId: user.id };
  });
}

/** Just the programme's name, for a page title. */
export async function programTitle(programId: string): Promise<string | undefined> {
  const loaded = await withProgram(programId, async () => ({}));
  return loaded?.full.program.name;
}
