# Design System — Mony Mobile

Source of truth for every visual decision in `apps/mobile`. The direction
("Índigo Suave": lavender page, floating white cards, the brand's
blue→indigo gradient, pastel icon badges) and the full rationale live in
`design/` at the repo root (PT-BR, owned by the app-design workflow):
`design/style-guide.md`, `design/componentes.md`, `design/telas.md`.
**No screen writes a raw hex color, a raw pixel number for
spacing/radius/type, or hand-rolls its own safe-area/keyboard handling,
buttons or inputs — it builds from the theme and the components below.**
Enforced by `code-reviewer` on every feature.

## Tokens

- `design/tokens.json` is the single source of truth (colors, gradients,
  type scale, spacing, radius, elevation, motion).
- `pnpm --filter @mony/ui-tokens sync` generates
  `packages/ui-tokens/src/generated.ts`; the package exports it as the
  `tokens` namespace. `python .claude/skills/app-design/scripts/validar_tokens.py`
  checks WCAG contrast of every semantic pair.
- The app ships **light theme only** (owner decision). `color.dark` in the
  JSON mirrors `color.light` just for the validator.

In the app, read tokens through `apps/mobile/src/theme`:

| Import                                                          | What                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useTheme()`                                                    | `{ colors, gradients, elevation(level) }` — semantic colors (`text`, `textMuted`, `primary`, `surface`, `success`, `danger`, `onGlass`…), the gradients (`brand`, `balance`, `progress`, `income`, `screen`) and platform shadows |
| `space`, `radius`, `layout`, `typeScale`, `iconSize`            | theme-independent tokens, safe in module-level `StyleSheet.create`                                                                                                                                                                |
| `useMotion()`                                                   | `{ reduced }` — OS "reduce motion" (+ DesignLab override in dev); every animation reads it                                                                                                                                        |
| `theme/haptics` → `haptic.selection/tick/stamp/success/error()` | haptics by intent                                                                                                                                                                                                                 |
| `theme/images`                                                  | generated image registry (`processar_imagens.py`)                                                                                                                                                                                 |

Typography: **Manrope only** (400–800), loaded file by file in
`theme/fonts.ts`. Every type token has a line height ≥ 1.4× its size —
Manrope's tall ascenders/descenders clip on Android below that. A `Text`
nested inside another `Text` must pass `inline` (no own line height), or
Android applies the inner line height to the whole line and clips it.

## Components

- `apps/mobile/src/components/ui/` — primitives and chrome.
- `apps/mobile/src/components/domain/` — the app's own pieces.
- `apps/mobile/src/components/effects/` — shared motion helpers (`useCountUp`).

### Primitives & chrome (`components/ui`)

| Component                                                                            | Purpose                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Text`                                                                               | type scale variants (`display`, `title1`–`title3`, `headline`, `body`, `bodyStrong`, `callout`, `subhead`, `footnote`, `caption`, `label`, `numeral`, `numeralLarge`, `amountInput`, …) + `tone`/`color`; `inline` for nested runs          |
| `Icon`                                                                               | Ionicons (the icon set stored for categories); `filled` swaps `-outline`                                                                                                                                                                    |
| `Touchable`                                                                          | Pressable with per-kind feedback: `sink` (cards/buttons), `row`, `fade`, `none`; optional haptic                                                                                                                                            |
| `Button`                                                                             | `primary` (brand gradient), `secondary` (soft indigo), `ghost`, `danger`, `dangerGhost`; `loading`, `disabled`, `leftIcon`, `size`                                                                                                          |
| `IconButton`                                                                         | `plain`, `soft` (white circle + shadow — header actions/back), `overlay`, `ink` (stepper); a11y label required                                                                                                                              |
| `TextField`                                                                          | label, `leftIcon`, `error`/`hint`, `secureToggle` (`${testID}-toggle-visibility`)                                                                                                                                                           |
| `SegmentedControl`                                                                   | pill track; the gradient pill glides to the selection; `variant="glass"` on gradients; option testIDs `${testID}-${value}`                                                                                                                  |
| `SelectChip`                                                                         | selectable pill chip (`dashed` for "none/automatic")                                                                                                                                                                                        |
| `Checkbox`                                                                           | row checkbox (`accessibilityState.checked/selected`)                                                                                                                                                                                        |
| `Card` · `IconBadge` · `ProgressBar` · `Gradient` · `ScreenBackground` · `withAlpha` | surfaces: white card with soft shadow, pastel circle with a colored glyph, gradient bar, gradient fill, the lavender page                                                                                                                   |
| `ScrollScreen`                                                                       | standard scrolling screen: lavender page, floating `TopBar` (centered title, soft circle buttons, white backdrop on scroll), tab-bar clearance; optional `largeTitle`, full-bleed `hero` (+`heroOverlap`), `keyboardAware`, pull-to-refresh |
| `TopBar`, `useScrollHeader`, `useScreenInsets`, `useBottomClearance`                 | building blocks for list screens (`SectionList`/`FlatList`) that can't use `ScrollScreen`                                                                                                                                                   |
| `FormScreen`                                                                         | modal forms: `SheetHeader` (close `header-close`), keyboard-aware scroll, CTA footer glued above the keyboard                                                                                                                               |
| `AuthLayout`                                                                         | entry screens: gradient hero with the Mony mark, form card over its edge                                                                                                                                                                    |
| `PaperSheet`                                                                         | bottom sheet (spring in, drag/backdrop/back to close, own keyboard avoidance)                                                                                                                                                               |
| `ConfirmSheet`                                                                       | replaces `Alert.alert` for consequential actions — preview of the affected item, question title, consequence, verb buttons (`${testID}-confirm`/`-cancel`, default `confirm-sheet`)                                                         |
| `AppToast`                                                                           | global toast (`useToastStore.getState().show(message, { tone, action, receipt })`)                                                                                                                                                          |
| `InlineNotice`                                                                       | persistent inline message (form errors, warnings, success)                                                                                                                                                                                  |
| `EmptyState`, `ErrorState`, `Skeleton`, `MarkLoader`                                 | empty (illustration slot or big badge + action), error (+ "Tentar de novo"), shaped skeletons, in-button loader                                                                                                                             |
| `MenuRow`, `SwipeRow`, `ColorPicker`, `IconPicker`, `AppImage`, `Rule`               | settings-style rows, swipe-to-delete, category pickers, registry images, separators                                                                                                                                                         |
| `AppTabBar`                                                                          | the custom tab bar (4 tabs + raised gradient "+"); reports its height, hides with the keyboard                                                                                                                                              |

### Domain components (`components/domain`)

`BalanceHero` (Início hero), `PeriodSummary`, `MoneyHero` (amount with
small "R$"/cents, counts to new values), `GoalProgress`, `YearChart`,
`StatusPill` (paid / to pay / overdue / paid off / reached…),
`TransactionItem`, `AmountField` (the amount as a form's hero),
`DebtCard`, `PantryItem`, `VehiclePhoto`, `VehicleHero`, `MercosulPlate`,
`Odometer`, `MaintenanceAlertRow` (a maintenance type's status on a
vehicle: pill, bar in the status tone, km/days left), `NotebookSwitch`
(workspace), `Initials`.

## Rules of thumb

- Deleting or undoing something goes through `ConfirmSheet`, never
  `Alert.alert`. Failures of background actions go to the toast; form
  submit failures to an `InlineNotice` next to the CTA.
- Lists of cards: one white card per row (`TransactionItem`,
  `PantryItem`, goals) or rows inside one card with hairline dividers
  (`MenuRow`, summaries). Swipe left to delete where the row offers it, and
  expose the same action as an accessibility action.
- Money: `lib/money-display` (`formatMoney`, `formatSigned`,
  `spokenMoney`) — sign + color for income/expense, tabular figures.
- Reanimated worklets (`useAnimatedStyle`, `useAnimatedReaction`, gesture
  callbacks) may only capture plain values — never React elements, props
  objects or class instances.
- Dev tools (`src/dev/`: Screen Catalog, DesignLab, in-memory mock API)
  load only under `__DEV__` through a constant-folded `require`; they never
  ship in release bundles.
