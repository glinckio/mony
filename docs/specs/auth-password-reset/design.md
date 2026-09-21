# Design — Auth: Password Reset

## Data model (Prisma)

```prisma
model PasswordResetCode {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  code      String   @db.VarChar(6)
  attempts  Int      @default(0)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId, code])
}
```

`attempts` bounds brute-forcing a single active code to 5 wrong guesses
before it's burned (`usedAt` set), independent of the per-endpoint
IP+email throttle below — closes the gap where an attacker who knows a
victim's email could otherwise rotate source IPs to bypass a purely
IP-keyed rate limit and grind through the 1,000,000-value code space
within its 1-hour lifetime.

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| POST | `/auth/password-reset/request` | none (throttled) | `RequestResetDto` | `{ message: string }` | 400 validation, 429 |
| POST | `/auth/password-reset/confirm` | none (throttled) | `ConfirmResetDto` | `{ message: string }` | 400 validation/invalid code |

`RequestResetDto`: `{ email: string }`.
`ConfirmResetDto`: `{ email: string; code: string; newPassword: string; newPasswordConfirmation: string }`.

Both endpoints throttled the same as login (5/5min) — codes are a brute-
forceable 6-digit space, rate limiting is load-bearing here, not optional.

**Email delivery**: abstracted behind a `MailerService` interface in
`apps/api/src/common/mailer/`, one method: `sendPasswordResetCode(email,
code)`. Concrete implementation uses **Brevo** (`@getbrevo/brevo` SDK,
`BREVO_API_KEY` from `.env`) — same provider as legacy. Kept behind an
interface anyway so a future provider swap doesn't touch `AuthService`.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `ForgotPasswordScreen` | `/forgot-password` | — | `POST /auth/password-reset/request` | Email input only, always shows the generic success message |
| `ResetPasswordScreen` | `/reset-password` | — | `POST /auth/password-reset/confirm` | Code input (6 digits) + new password + confirmation |

## Shared types

`packages/shared-types/src/auth.ts`: `RequestResetInput`,
`ConfirmResetInput` zod schemas.

## Error handling

- Request step: always show the same success message regardless of
  whether the email exists — client must not branch on this.
- Confirm step: generic "Invalid or expired code" for both wrong-code and
  expired-code cases (don't leak which).
- Password rules violation → same inline validation as registration.
