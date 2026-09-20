# Tasks — User Profile

## API

- [ ] `UsersModule`, `UsersController` (guarded by `AuthGuard`)
- [ ] `GET /users/me`, `PATCH /users/me`, `POST /users/me/change-password`,
      `PATCH /users/me/workspace`
- [ ] DTOs with validation + `@ApiProperty` examples
- [ ] Email-change uniqueness check
- [ ] Change-password: verify current password with `bcrypt.compare` first
- [ ] Swagger decorators on all four endpoints
- [ ] Update `docs/postman/collection.json` with examples for all four
- [ ] Unit tests: update profile, email conflict, change password
      (success + wrong current password), workspace switch
- [ ] E2E tests: full profile edit + password change + workspace switch flow

## Shared types

- [ ] `packages/shared-types/src/user.ts`: `Profile`, `UpdateProfileInput`,
      `ChangePasswordInput`, `WorkspaceType`

## Mobile

- [ ] `ProfileScreen`
- [ ] `ChangePasswordScreen`
- [ ] App-header workspace switcher component + Zustand store slice for
      `activeWorkspace` (synced from `GET /users/me` on login/app start)
- [ ] Unit tests: profile form validation, password form validation
- [ ] Maestro flow: `e2e/flows/profile-edit.yaml` — edit name, change
      password, log out, log back in with the new password

## Review gates

- [ ] `lgpd-security-reviewer` — phone/email edit handling, password change security
- [ ] `code-reviewer`
- [ ] `api-contract-guardian`
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
