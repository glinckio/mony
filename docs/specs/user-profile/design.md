# Design — User Profile

## Data model (Prisma)

No new models — uses `User` fields already defined (`auth-register`).

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/users/me` | Bearer | — | `ProfileDto` | 401 |
| PATCH | `/users/me` | Bearer | `UpdateProfileDto` | `ProfileDto` | 400, 401, 409 email taken |
| POST | `/users/me/change-password` | Bearer | `ChangePasswordDto` | 204 | 400, 401 (wrong current password) |
| PATCH | `/users/me/workspace` | Bearer | `SwitchWorkspaceDto` | `ProfileDto` | 400, 401 |

`UpdateProfileDto`: `{ name?: string; email?: string; phone?: string; phone2?: string }` (all optional, `PATCH` semantics).
`ChangePasswordDto`: `{ currentPassword: string; newPassword: string; newPasswordConfirmation: string }`.
`SwitchWorkspaceDto`: `{ workspace: "PERSONAL" | "BUSINESS" }`.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `ProfileScreen` | `/profile` | `GET /users/me` | `PATCH /users/me` | Editable fields inline or a form, matches legacy layout intent |
| `ChangePasswordScreen` | `/profile/change-password` | — | `POST /users/me/change-password` | Separate screen, not inline — matches "current + new + confirm" pattern |
| Workspace switcher | header component, app-wide | — | `PATCH /users/me/workspace` | A persistent toggle (e.g. segmented control in the app header), not buried in profile — matches how central it is in legacy (affects nearly every screen) |

## Shared types

`packages/shared-types/src/user.ts`: `Profile`, `UpdateProfileInput`,
`ChangePasswordInput`, `WorkspaceType` zod schema/type — `WorkspaceType`
is imported by `transactions`, `debts`, and `goals` specs too.

## Error handling

- Email change conflict → inline field error.
- Wrong current password → inline error on the current-password field,
  not a generic toast.
- Workspace switch failure → revert the UI toggle optimistic update,
  show a toast (this is a frequent, low-stakes action — optimistic UI is
  appropriate here, unlike form submissions).
