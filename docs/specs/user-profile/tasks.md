# Tasks — User Profile

## API

- [x] `UsersModule`, `UsersController` (guarded by `AuthGuard`)
- [x] `GET /users/me`, `PATCH /users/me`, `POST /users/me/change-password`,
      `PATCH /users/me/workspace`
- [x] DTOs with validation + `@ApiProperty` examples
- [x] Email-change uniqueness check
- [x] Change-password: verify current password with `bcrypt.compare` first
- [x] Swagger decorators on all four endpoints
- [x] Update `docs/postman/collection.json` with examples for all four
- [x] Unit tests: update profile, email conflict, change password
      (success + wrong current password), workspace switch
- [x] E2E tests: full profile edit + password change + workspace switch flow
      (written, matches existing e2e pattern — not run live here, no local
      Postgres/Docker available in this session)

## Shared types

- [x] `packages/shared-types/src/user.ts`: `Profile`, `UpdateProfileInput`,
      `ChangePasswordInput`, `WorkspaceType`

## Mobile

- [x] `ProfileScreen`
- [x] `ChangePasswordScreen`
- [x] App-header workspace switcher component + Zustand store slice for
      `activeWorkspace` (synced from `GET /users/me` on login/app start)
- [x] Unit tests: profile form validation, password form validation
- [x] Maestro flow: `e2e/flows/profile-edit.yaml` — edit name, change
      password, log out, log back in with the new password

## Review gates

- [x] `lgpd-security-reviewer` — phone/email edit handling, password change security
- [x] `code-reviewer`
- [x] `api-contract-guardian`
- [x] Lint + typecheck clean, all tests green (API + mobile)
- [x] `workflow-guardian` — commit message(s) drafted, lint/typecheck/tests confirmed clean repo-wide
