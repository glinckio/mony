# Design — Goals

## Data model (Prisma)

```prisma
model Goal {
  id             String        @id @default(uuid())
  userId         String
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace      WorkspaceType
  categoryId     String?
  category       Category?     @relation(fields: [categoryId], references: [id])
  title          String        @db.VarChar(100)
  description    String?       @db.VarChar(500)
  targetAmount   Decimal       @db.Decimal(12, 2)
  currentAmount  Decimal       @default(0) @db.Decimal(12, 2)
  targetDate     DateTime?     @db.Date
  completed      Boolean       @default(false)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([userId, workspace, completed])
}
```

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/goals?completed=` | Bearer | — | `GoalDto[]` | 401 |
| POST | `/goals` | Bearer | `CreateGoalDto` | `GoalDto` | 400, 401 |
| PATCH | `/goals/:id` | Bearer | `UpdateGoalDto` | `GoalDto` | 400, 401, 404 |
| DELETE | `/goals/:id` | Bearer | — | 204 | 401, 404 |

`GoalDto` includes a computed `progressPercent: number` field alongside
the stored fields — computed in the service layer, not stored in the DB.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `GoalsScreen` | `/goals` | `GET /goals` | — | List with progress bars, "atrasada" (overdue) badge if `targetDate` past and `!completed` — matches legacy |
| `GoalFormScreen` | `/goals/new`, `/goals/:id/edit` | `GET /categories` | `POST`/`PATCH /goals` | Includes a direct `currentAmount` input (not a "contribute" flow) and a `completed` checkbox |

## Shared types

`packages/shared-types/src/goal.ts`: `Goal`, `CreateGoalInput`,
`UpdateGoalInput` zod schemas.

## Error handling

- `currentAmount`/`targetAmount` validation errors → inline field errors.
- Overdue-but-incomplete goals are a display state, not an error.
