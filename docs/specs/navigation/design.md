# Design — Navigation (bottom tab bar)

## Data model (Prisma)

None — pure navigation-container change.

## API surface

None.

## Mobile screens

| Screen | Route | Notes |
|---|---|---|
| `MainTabs` | inside `AppStack` as a single screen | `createBottomTabNavigator` from `@react-navigation/bottom-tabs`, wrapping the five tab screens below |
| `DashboardScreen` | tab `Home` | unchanged content; drops its own header "go to Profile" icon now that Profile is a tab |
| `TransactionsListScreen` | tab `Transactions` | unchanged |
| `CategoriesScreen` | tab `Categories` | unchanged; drops its `go-to-home` button |
| `GoalsScreen` | tab `Goals` | unchanged |
| `ProfileScreen` | tab `Profile` | unchanged; drops its `go-to-home` button |

`AppStackParamList` keeps only `MainTabs` plus the modal/detail routes
that aren't tabs: `ChangePassword`, `CategoryForm`, `TransactionForm`,
`GoalForm`. A new `MainTabParamList` holds the five tab routes.

Screens that live inside the tab navigator need to reach both sibling
tabs (e.g. Dashboard's goal preview → `Goals` tab) and stack-level modal
routes (e.g. Categories → `CategoryForm`). React Navigation resolves an
unmatched route name by searching up the navigator tree, so
`navigate("CategoryForm")` called from a tab screen still finds it on
the parent stack — but the navigation hook's TypeScript type needs to
know about both param lists. Each tab screen types its navigation prop
as a composite (`CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList>,
NavigationProp<AppStackParamList>>`), exported as `MainTabNavigation`
from `RootNavigator.tsx`, replacing their previous `AppStackNavigation`
type. Modal screens keep using `AppStackNavigation` as before (they
only ever navigate to `goBack()` or a sibling modal route).

Tab bar styling: `tabBarActiveTintColor: color.primary`,
`tabBarInactiveTintColor: color.textSecondary`,
`tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.border }`
— reuses existing tokens, no new ones needed. Icons via
`@expo/vector-icons` `Ionicons`, one per tab (already the icon set used
everywhere else in the app). `headerShown: false` on the tab navigator
too — each screen still renders its own `AppHeader` inside `Screen`,
unchanged.

Each tab's `options` sets `tabBarButtonTestID` (the real React
Navigation option — `tabBarTestID` doesn't exist) to `tab-home` /
`tab-transactions` / `tab-categories` / `tab-goals` / `tab-profile`, so
Maestro flows have a stable way to switch tabs instead of the removed
`go-to-home`-style buttons.

## Shared types

None.

## Error handling

None — no new failure modes, this doesn't touch data fetching.
