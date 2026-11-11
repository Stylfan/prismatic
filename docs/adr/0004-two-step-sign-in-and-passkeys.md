# ADR 0004: Two-step sign-in and passkeys

Status: accepted · Date: 2026-11-11 · Extends ADR 0002

## Context

Haij's sixth rule asks for passkeys and two-factor sign-in from the start.
ADR 0002 gave Prismatic passwords only and named both as owed before
hosting.

## The decision

- **TOTP written here, on Node's own crypto.** RFC 6238 with HMAC-SHA1,
  six digits, 30 seconds, one step of drift either way: what every
  authenticator app expects. It is some forty lines, tested against the
  RFC's own vectors. A code is claimed with one conditional UPDATE, so of
  two requests with the same code only one gets in.
- **The secret is encrypted at rest** with AES-256-GCM under a key derived
  (HKDF) from `PRISMATIC_SECRET`, which lives in the environment. A copy of
  the database alone does not hand out the second factor.
- **Ten recovery codes**, shown once, stored as SHA-256 hashes, each
  usable once. Without mail in Prismatic, they are the way back in when a
  phone is lost.
- **A pending sign-in, not a session.** A right password with two-step on
  creates a challenge that lasts five minutes and five wrong codes, named
  by an HttpOnly cookie. It opens nothing by itself.
- **Passkeys through `@simplewebauthn/server` and `/browser`.** WebAuthn's
  attestation formats and COSE keys are too much to write and get right
  here. Credentials are discoverable, so a passkey signs in without an
  e-mail first, and counts as both factors. The relying party is
  `PRISMATIC_URL`, or the request's own address on localhost.
- **QR codes through `qrcode`**, drawn as SVG on the server, so the secret
  never travels to a third-party QR service.

## Trade-offs accepted

- **Three new dependencies** (`@simplewebauthn/server`, `/browser`,
  `qrcode`). Each is widely used, maintained and has no network calls of
  its own.
- **Two-step is a choice per account, not a requirement.** An
  installation for one person should not lock its only user out on day
  one. Requiring it per installation can come later.
- **Losing `PRISMATIC_SECRET` stops the codes from the app working.**
  Recovery codes and passkeys still let people in, and the owner can clear
  `users.totp_secret` in the database. The self-hosting guide says to back
  the key up with the database.
- **The attempt limits live in memory**, as in ADR 0002.
