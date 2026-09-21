# Tasks — Auth: Password Reset

## API

- [x] Prisma: `PasswordResetCode` model + migration
- [x] Install `@getbrevo/brevo`; add `BREVO_API_KEY` to `.env`/`.env.example`
- [x] `common/mailer/mailer.service.ts` interface + Brevo implementation
      (`sendPasswordResetCode`); a log-only implementation gated behind
      `NODE_ENV=test` is used for E2E, not the real Brevo call
- [x] `RequestResetDto`, `ConfirmResetDto` with validation
- [x] `AuthService.requestPasswordReset()`: generate code, invalidate
      priors, store, send email, always-generic response
- [x] `AuthService.confirmPasswordReset()`: validate code (match, unused,
      unexpired), update password hash, mark code used
- [x] Throttle both endpoints
- [x] Swagger decorators on both endpoints
- [x] Update `docs/postman/collection.json` with reset request/confirm examples
- [x] Unit tests: valid flow, expired code, wrong code, reused code,
      unknown email still returns generic success
- [x] E2E test: request → confirm → login with new password

## Shared types

- [x] `packages/shared-types/src/auth.ts`: `RequestResetInput`, `ConfirmResetInput`

## Mobile

- [x] `ForgotPasswordScreen`
- [x] `ResetPasswordScreen`
- [x] Unit tests: code input validation (6 digits), password match validation
- [x] Maestro flow: `e2e/flows/password-reset.yaml` (note: needs a way to
      read the generated code in a test env — add a test-only endpoint or
      log-based mailer for E2E, gated behind `NODE_ENV=test`)

## Review gates

- [x] `code-reviewer` — found and fixed: confirm-code race condition,
      IP-rotation throttle bypass, mailer-failure enumeration leak
- [x] `qa-engineer` — added expiry/enumeration/cross-user coverage gaps
- [x] `api-contract-guardian` — no gaps found
- [x] `performance-auditor` — found and fixed: synchronous mailer await
      blocking the response
- [x] `lgpd-security-reviewer` — found and fixed: throttle bypass math,
      mailer fail-open in prod, log level; documented third-party sharing
- [x] Lint + typecheck clean, all tests green
- [x] `workflow-guardian` — commit message(s) drafted
