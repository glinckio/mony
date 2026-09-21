# Design System — Mony Mobile

Source of truth for every visual decision in `apps/mobile`. Tokens live in
`packages/ui-tokens/src/index.ts`; a small component library in
`apps/mobile/src/components/ui/` is built from them. **No screen writes a
raw hex color, a raw pixel number for spacing/radius, or hand-rolls its
own `SafeAreaView`/`KeyboardAvoidingView`/button/input — it imports from
`@mony/ui-tokens` and `../components/ui` instead.** This is enforced by
`code-reviewer` on every feature going forward.

## Where the palette came from

The client already has a brand palette — extracted from
`legacy_php_reference/_public_html/como-usar/assets/*.css` (a built
Tailwind/shadcn stylesheet, `:root` CSS custom properties) and
cross-checked against the Mony "M" logo
(`legacy_php_reference/_public_html/app/logo.png`, a teal-to-blue
gradient mark). The extracted `--primary`/`--accent` value, `hsl(214 82%
49%)` → `#166FE3`, is the app's brand blue. This was a **light** theme
(`--background: 0 0% 98%`) — that's what Mony ships. The legacy CSS also
defines a full `.dark` variant; those HSL values aren't wired into
`ui-tokens` yet since dark mode hasn't been requested, but are recorded
here in case it is later:

| Token | Light (shipped) | Dark (legacy value, unused) |
|---|---|---|
| background | `#FAFAFA` | `hsl(222.2 84% 4.9%)` → `#020817` |
| foreground | `#2B303B` | `hsl(210 40% 98%)` → `#F8FAFC` |
| primary | `#166FE3` | `hsl(210 40% 98%)` (inverted — light primary on dark bg) |
| border | `#E1E7EF` | `hsl(217.2 32.6% 17.5%)` → `#1E293B` |
| destructive | `#EF4444` | `hsl(0 62.8% 30.6%)` → `#7F1D1D` |

## Tokens (`packages/ui-tokens`)

### Color

| Token | Value | Use |
|---|---|---|
| `primary` | `#166FE3` | CTAs, links, active/focus states, brand accents |
| `primaryPressed` | `#125BBA` | Pressed/active state of a primary control |
| `primaryMuted` | `#E8F1FD` | Soft background for badges, selected chips |
| `onPrimary` | `#FFFFFF` | Text/icons on top of `primary` |
| `background` | `#FAFAFA` | Screen background |
| `surface` | `#FFFFFF` | Cards, inputs, sheets |
| `surfaceAlt` | `#F1F5F9` | Secondary fill (disabled inputs, subtle sections) |
| `overlay` | `rgba(15,23,42,.45)` | Modal/sheet backdrops |
| `border` / `borderFocus` | `#E1E7EF` / `#166FE3` | Default vs. focused input/card border |
| `textPrimary` / `textSecondary` / `textDisabled` | `#2B303B` / `#65758B` / `#9AA5B1` | Body text hierarchy |
| `success` / `successMuted` | `#1DAF52` / `#E5FBED` | Positive states, confirmations |
| `danger` / `dangerMuted` | `#EF4444` / `#FDE8E8` | Errors, destructive actions |
| `warning` / `warningMuted` | `#D97706` / `#FFFAEB` | Caution states (muted value is the legacy "tip" callout background) |
| `info` / `infoMuted` | `#3B82F6` / `#E7EFFE` | Informational banners, distinct from `primary` CTAs |

### Spacing, radius, sizing

- `spacing`: `xxs`(2) `xs`(4) `sm`(8) `md`(16) `lg`(24) `xl`(32) `xxl`(48) — 4px-based scale, use these for every margin/padding/gap.
- `radius`: `sm`(8) `md`(12) `lg`(16) `xl`(24) `pill`(999) — `md`/12px matches the legacy `--radius: .75rem`, used on inputs/buttons/cards by default.
- `size.touchTarget` (44) / `size.controlHeight` (52) — every tappable control (`Button`, `TextField`) respects these so nothing falls below the iOS HIG / Material minimum hit area.
- `size.maxContentWidth` (480) — caps form/card width on tablets; `Screen` applies it automatically.

### Typography

`typography.size`/`lineHeight` scale: `xs`(12) `sm`(14) `md`(16) `lg`(18)
`xl`(22) `xxl`(28) `display`(34). `weight`: `regular`(400) `medium`(500)
`semibold`(600) `bold`(700). `fontFamily: "System"` — no custom font
bundled (legacy didn't use one either, just the system-ui stack), so this
maps to San Francisco on iOS / Roboto on Android for free.

### Shadow

`shadow.sm` / `shadow.md` — platform-aware style objects (`shadowColor`/
`shadowOffset`/`shadowOpacity`/`shadowRadius` for iOS, `elevation` for
Android). Spread into a `StyleSheet` entry: `{ ...shadow.md, ... }`.

## Components (`apps/mobile/src/components/ui`)

| Component | Purpose |
|---|---|
| `Screen` | Wraps `SafeAreaView` + optional `KeyboardAvoidingView` + optional `ScrollView`. Every screen renders through this — see `docs/steering/structure.md` "Mobile screen conventions" for the safe-area/keyboard reasoning. Props: `scrollable`, `keyboardAvoiding`, `edges`, `centered`, `contentStyle`. |
| `Text` | Typography variants: `display` `heading` `title` `body` `bodyStrong` `caption`. Optional `color` override for semantic colors (danger, secondary, etc). |
| `Button` | Variants `primary` `secondary` `ghost`; `loading`, `disabled`, `leftIcon`, `fullWidth` props. Always meets `size.controlHeight`. |
| `TextField` | Labeled input with inline `error` text, focus/error border states, optional `secureToggle` (adds an eye icon via `@expo/vector-icons` `Ionicons` to reveal/hide a password field). |

Icons: `@expo/vector-icons` (bundled with Expo) — default to `Ionicons`
unless a specific icon only exists in another set.

## Example: how `auth-register`'s `RegisterScreen` uses this

- `Screen` (default scrollable + keyboard-avoiding) as the root.
- A `primaryMuted` circular badge with an `Ionicons` glyph as a light
  visual anchor above the title (no logo image asset exists yet).
- `Text variant="heading"` for the title, `variant="caption"` for the
  subtitle.
- One `TextField` per form field, `secureToggle` on both password fields.
- A `dangerMuted` banner (icon + `Text variant="caption" color={danger}`)
  for the generic submit-failure case; field-level errors go through
  `TextField`'s own `error` prop instead (see `docs/steering/tech.md`
  language policy for why these are always pt-BR copy, never a raw API
  string).
- `Button variant="primary"` with `loading={isSubmitting}` as the submit
  control.

Every future screen should reach for this same vocabulary before
inventing new patterns — if a screen needs something `ui/` doesn't have
yet (a select/dropdown, a date picker, a segmented control for the
workspace switcher, etc.), add it there as a proper token-driven
component, don't one-off it inline in the screen file.
