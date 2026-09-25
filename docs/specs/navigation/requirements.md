# Requirements — Navigation (bottom tab bar)

## Summary

Replaces the current ad-hoc navigation (each list screen carrying its
own "go back home" / "go to X" buttons, discovered mid-`dashboard` phase
to have been silently dropped when `HomeScreen` was replaced by
`DashboardScreen`) with a persistent bottom tab bar across the five main
authenticated screens, so every top-level section is always one tap
away regardless of which one the user is currently on.

## User stories

- As a user, I want a tab bar always visible so I can jump between
  Início, Transações, Categorias, Metas, and Perfil without hunting for
  a back button on whichever screen I'm on.

## Acceptance criteria (EARS)

- WHEN the user is authenticated, THE SYSTEM SHALL show a bottom tab bar
  with exactly five tabs: Início (dashboard), Transações, Categorias,
  Metas, Perfil.
- WHEN the user taps a tab, THE SYSTEM SHALL navigate to that section
  without an intermediate back button being required.
- Modal/detail screens (transaction form, category form, goal form,
  change password) are NOT tabs — they're pushed on top of the tab
  navigator as before (`presentation: "modal"` where applicable) and
  dismissed via their own cancel/submit, same as today.
- THE SYSTEM SHALL preserve every existing cross-screen `navigate()`
  call (e.g. dashboard's goal-preview tap → Goals tab, category
  edit → CategoryForm modal) — this is a navigation-container change,
  not a feature behavior change.

## Out of scope

- Per-tab navigation stacks / independent back-stacks per tab (each tab
  screen is a single screen, not its own stack, for now).
- Badge counts / notification dots on tabs.
- Tab bar customization (reordering, hiding tabs) — fixed five tabs.

## Open questions

- None blocking.

## Amendment (2026-09-23)

The five tabs are now Início, Transações, Metas, **Mais**, Perfil —
`Categorias` moved into the `Mais` menu alongside `Dívidas` (and every
later secondary feature). See design.md → Amendment.
