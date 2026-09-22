# Tasks — Navigation (bottom tab bar)

- [x] Install `@react-navigation/bottom-tabs`
- [x] `MainTabParamList` + `MainTabNavigation` composite type in `RootNavigator.tsx`
- [x] `MainTabs` bottom-tab navigator (5 tabs, icons, token-based styling,
      `tabBarButtonTestID` per tab — `tabBarTestID` doesn't exist, caught
      by a typecheck failure during implementation)
- [x] `AppStackParamList` trimmed to `MainTabs` + modal/detail routes only
- [x] Update the 5 tab screens' `useNavigation<...>()` type to `MainTabNavigation`
- [x] Remove now-redundant `go-to-home` buttons (Categories, Profile) and Dashboard's header "go to Profile" icon
- [x] Update Maestro flows (`categories.yaml`, `goals.yaml`, `transactions.yaml`, `profile-edit.yaml`, `dashboard.yaml`) to tap tab-bar `tabBarButtonTestID`s instead of the removed buttons / `- back`
- [x] Lint + typecheck clean, all mobile tests green (15 suites / 53 tests)
- [x] `code-reviewer` — clean, no blockers. Flagged one follow-up (not
      blocking): unit tests for the 5 tab screens still wrap themselves
      in a flat single-level stack rather than the real nested
      `AppStack > MainTabs` topology, so a regression in the
      `CompositeNavigationProp` wiring would only be caught by Maestro
      or manual QA, not `pnpm test`. Worth a nested-navigator test
      harness as a follow-up, not required for this change.
- [ ] Commit message drafted for the human to apply
