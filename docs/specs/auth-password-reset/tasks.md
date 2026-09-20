# Tasks — Auth: Password Reset

## API

- [ ] Prisma: `PasswordResetCode` model + migration
- [ ] Install `@getbrevo/brevo`; add `BREVO_API_KEY` to `.env`/`.env.example`
- [ ] `common/mailer/mailer.service.ts` interface + Brevo implementation
      (`sendPasswordResetCode`); a log-only implementation gated behind
      `NODE_ENV=test` is used for E2E, not the real Brevo call
- [ ] `RequestResetDto`, `ConfirmResetDto` with validation
- [ ] `AuthService.requestPasswordReset()`: generate code, invalidate
      priors, store, send email, always-generic response
- [ ] `AuthService.confirmPasswordReset()`: validate code (match, unused,
      unexpired), update password hash, mark code used
- [ ] Throttle both endpoints
- [ ] Swagger decorators on both endpoints
- [ ] Update `docs/postman/collection.json` with reset request/confirm examples
- [ ] Unit tests: valid flow, expired code, wrong code, reused code,
      unknown email still returns generic success
- [ ] E2E test: request → confirm → login with new password

## Shared types

- [ ] `packages/shared-types/src/auth.ts`: `RequestResetInput`, `ConfirmResetInput`

## Mobile

- [ ] `ForgotPasswordScreen`
- [ ] `ResetPasswordScreen`
- [ ] Unit tests: code input validation (6 digits), password match validation
- [ ] Maestro flow: `e2e/flows/password-reset.yaml` (note: needs a way to
      read the generated code in a test env — add a test-only endpoint or
      log-based mailer for E2E, gated behind `NODE_ENV=test`)

## Review gates

- [ ] `lgpd-security-reviewer` — code brute-force protection, no code/PII in logs
- [ ] `code-reviewer`
- [ ] `api-contract-guardian`
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
