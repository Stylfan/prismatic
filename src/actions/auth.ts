"use server";

import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/auth/password";
import { allowAttempt, clearAttempts } from "@/auth/rate-limit";
import { endSession, startSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { EmailTaken, SignupClosed, authenticate, registerUser } from "@/services/users";

/**
 * Signing up, in and out. Failures to sign in are worded the same whether
 * the address exists or the password is wrong, and attempts per address are
 * limited.
 */

export type AuthResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "credentials" | "tooMany" | "signupClosed" | "emailTaken" };

const Email = z.string().trim().toLowerCase().email().max(200);

const LoginSchema = z.object({ email: Email, password: z.string().min(1).max(200) });

const RegisterSchema = z.object({
  email: Email,
  name: z.string().trim().max(80),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

export async function loginAction(raw: unknown): Promise<AuthResult> {
  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { email, password } = parsed.data;
  if (!allowAttempt(email)) return { ok: false, error: "tooMany" };
  const user = await authenticate(getDb(), email, password);
  if (!user) return { ok: false, error: "credentials" };
  clearAttempts(email);
  await startSession(user.id);
  return { ok: true };
}

export async function registerAction(raw: unknown): Promise<AuthResult> {
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    const user = await registerUser(getDb(), parsed.data);
    await startSession(user.id);
    return { ok: true };
  } catch (error) {
    if (error instanceof SignupClosed) return { ok: false, error: "signupClosed" };
    if (error instanceof EmailTaken) return { ok: false, error: "emailTaken" };
    console.error("registration failed", error);
    return { ok: false, error: "invalid" };
  }
}

export async function logoutAction(): Promise<void> {
  await endSession();
}
