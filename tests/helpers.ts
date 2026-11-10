import type { Db } from "@/db/client";
import { users } from "@/db/schema";

/** A user row for service tests; the password is never checked here. */
export function seedUser(db: Db, email: string): string {
  const [row] = db
    .insert(users)
    .values({ email, passwordHash: "scrypt$1$1$1$x$x" })
    .returning({ id: users.id })
    .all();
  return row!.id;
}
