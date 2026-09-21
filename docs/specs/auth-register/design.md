# Design — Auth: Register

## Data model (Prisma)

First feature — establishes the base `User` model. Later features add
their own models referencing `User`.

```prisma
enum Role {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

enum WorkspaceType {
  PERSONAL
  BUSINESS
}

model User {
  id           String     @id @default(uuid())
  name         String     @db.VarChar(100)
  email        String     @unique @db.VarChar(100)
  phone        String?    @db.VarChar(11)
  phone2       String?    @db.VarChar(11)
  passwordHash String
  role         Role       @default(USER)
  status       UserStatus @default(ACTIVE)
  activeWorkspace WorkspaceType @default(PERSONAL)
  createdAt    DateTime   @default(now())
  lastAccessAt DateTime?
  updatedAt    DateTime   @updatedAt
}
```

`activeWorkspace` lives on `User` (not passed per-request) — matches
legacy's session-level toggle. Mutated only via the `user-profile`
feature's workspace-switch endpoint.

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| POST | `/auth/register` | none | `RegisterDto` | `AuthTokensDto` | 400 validation, 409 email taken |

`RegisterDto`:
```ts
{
  name: string;      // @IsString @Length(1,100)
  email: string;     // @IsEmail @MaxLength(100)
  password: string;  // @IsString @MinLength(8) @MaxLength(72)
  passwordConfirmation: string; // @IsString, must equal password (custom validator)
  phone?: string;    // @IsOptional @Matches(/^\d{10,11}$/)
}
```

`AuthTokensDto` (shared across register/login/refresh):
```ts
{
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; activeWorkspace: "PERSONAL" | "BUSINESS" };
}
```

Password hashing: `bcrypt`, cost factor 12 (Nest `bcrypt` package, not
PHP's `password_hash` — equivalent algorithm, new implementation).

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `RegisterScreen` | `/register` | — | `POST /auth/register` | Name, email, password, confirm password, optional phone. On success, store tokens via `expo-secure-store`, navigate to the authenticated stack (dashboard placeholder is fine until feature 7 lands). |

## Shared types

`packages/shared-types/src/auth.ts`: `RegisterInput` (zod schema mirroring
`RegisterDto`), `AuthTokens` type. Exported from the package barrel.

## Error handling

All user-facing text is pt-BR (see `docs/steering/tech.md` language
policy) — the API's `message` string is never shown directly.

- Duplicate email (API 409) → mapped client-side to an inline field error
  under the email input via `setError("email", ...)`, not a toast —
  matches how a user would expect to correct it. Message: "Este e-mail
  já está cadastrado."
- Any other/unmapped API error → generic banner: "Algo deu errado. Tente
  novamente."
- Password/confirmation mismatch, invalid email, bad phone format →
  caught client-side by the zod schema (pt-BR messages baked into
  `registerInputSchema` itself) before the request is even sent.
