import type { Db } from "@/db/client";
import { users } from "@/db/schema";

/** A user row for service tests; the password is never checked here. */
export async function seedUser(db: Db, email: string): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({ email, name: email.split("@")[0]!, passwordHash: "scrypt$1$1$1$x$x" })
    .returning({ id: users.id });
  return row!.id;
}
