import type {
  Category,
  CategoryType,
  Debt,
  Goal,
  GroceryItem,
  Profile,
  Transaction,
  Vehicle,
} from "@mony/shared-types";
import {
  createBottomTabNavigator,
  type BottomTabNavigationProp,
} from "@react-navigation/bottom-tabs";
import {
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
  type CompositeNavigationProp,
  type NavigationProp,
  type Theme as NavigationTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useMemo } from "react";

import { AppTabBar, type IconName } from "../components/ui";
import { CATALOG_ON_START, DEV_TOOLS_ENABLED } from "../dev/flags";
import { apiFetch } from "../lib/api-client";
import { useAuthStore } from "../lib/auth-store";
import { useWorkspaceStore } from "../lib/workspace-store";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import { CategoriesScreen } from "../screens/categories/CategoriesScreen";
import { CategoryFormScreen } from "../screens/categories/CategoryFormScreen";
import { DashboardScreen } from "../screens/dashboard/DashboardScreen";
import { DebtDetailScreen } from "../screens/debts/DebtDetailScreen";
import { DebtFormScreen } from "../screens/debts/DebtFormScreen";
import { DebtsListScreen } from "../screens/debts/DebtsListScreen";
import { GoalFormScreen } from "../screens/goals/GoalFormScreen";
import { GoalsScreen } from "../screens/goals/GoalsScreen";
import { GroceryItemFormScreen } from "../screens/grocery/GroceryItemFormScreen";
import { GroceryScreen } from "../screens/grocery/GroceryScreen";
import { MoreScreen } from "../screens/more/MoreScreen";
import { ChangePasswordScreen } from "../screens/profile/ChangePasswordScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { TransactionFormScreen } from "../screens/transactions/TransactionFormScreen";
import { TransactionsListScreen } from "../screens/transactions/TransactionsListScreen";
import { VehicleDetailScreen } from "../screens/vehicles/VehicleDetailScreen";
import { VehicleFormScreen } from "../screens/vehicles/VehicleFormScreen";
import { VehiclesListScreen } from "../screens/vehicles/VehiclesListScreen";
import { useTheme } from "../theme";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Goals: undefined;
  More: undefined;
};

export type AppStackParamList = {
  MainTabs: { screen?: keyof MainTabParamList } | undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Categories: undefined;
  Debts: undefined;
  DebtDetail: { debtId: string };
  DebtForm: { debt?: Debt } | undefined;
  Grocery: undefined;
  GroceryItemForm: { item?: GroceryItem } | undefined;
  Vehicles: undefined;
  VehicleDetail: { vehicleId: string };
  VehicleForm: { vehicle?: Vehicle } | undefined;
  CategoryForm: { category?: Category; type?: CategoryType } | undefined;
  TransactionForm: { transaction?: Transaction } | undefined;
  GoalForm: { goal?: Goal } | undefined;
};

// Dev builds only: the screen catalog, the design system and copies of
// the auth screens (so they can be previewed while signed in). Kept out
// of AppStackParamList so app code can't navigate to routes that don't
// exist in release.
type DevStackParamList = {
  Catalog: undefined;
  DesignSystem: undefined;
} & AuthStackParamList;

export type AuthStackNavigation = NavigationProp<AuthStackParamList>;
export type AppStackNavigation = NavigationProp<AppStackParamList>;

// Screens living inside the tab navigator need to reach both sibling
// tabs and the stack-level routes (e.g. Goals -> GoalForm, More -> Debts)
// — React Navigation resolves an unmatched route name by searching up
// the navigator tree at runtime, but the type needs to know about both
// param lists for that to type-check.
export type MainTabNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NavigationProp<AppStackParamList>
>;

export const navigationRef = createNavigationContainerRef<AppStackParamList & DevStackParamList>();

// Catalog + design-system screens: dev builds only (see src/dev/devtools.ts).
const devtools: typeof import("../dev/devtools") | null =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  __DEV__ && DEV_TOOLS_ENABLED ? require("../dev/devtools") : null;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList & DevStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, IconName> = {
  Home: "home-outline",
  Transactions: "swap-vertical-outline",
  Goals: "flag-outline",
  More: "grid-outline",
};

function MainTabs() {
  return (
    <MainTab.Navigator
      screenOptions={{ headerShown: false, animation: "fade" }}
      tabBar={(props) => (
        <AppTabBar
          {...props}
          icons={TAB_ICONS}
          launch={{
            accessibilityLabel: "Novo lançamento",
            testID: "tab-new-transaction",
            onPress: () => props.navigation.navigate("TransactionForm"),
          }}
        />
      )}
    >
      <MainTab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ title: "Início", tabBarButtonTestID: "tab-home" }}
      />
      <MainTab.Screen
        name="Transactions"
        component={TransactionsListScreen}
        options={{ title: "Lançamentos", tabBarButtonTestID: "tab-transactions" }}
      />
      <MainTab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ title: "Metas", tabBarButtonTestID: "tab-goals" }}
      />
      <MainTab.Screen
        name="More"
        component={MoreScreen}
        options={{ title: "Mais", tabBarButtonTestID: "tab-more" }}
      />
    </MainTab.Navigator>
  );
}

const MODAL = { presentation: "modal" } as const;

export function RootNavigator() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const { colors } = useTheme();

  // Syncs the workspace slice from the source of truth on app start /
  // login, per design.md — the auth token's `activeWorkspace` claim can
  // go stale after a switch elsewhere. Keyed on `userId`, not the raw
  // access token, so a silent token refresh (api-client.ts) — which
  // changes the token but not the signed-in user — doesn't re-trigger it.
  useEffect(() => {
    if (!accessToken || !userId) return;
    apiFetch<Profile>("/users/me")
      .then((profile) => setActiveWorkspace(profile.activeWorkspace))
      .catch(() => {
        // Best-effort — the notebook switch just stays unset until the
        // next successful fetch.
      });
  }, [userId, setActiveWorkspace]);

  // Lavender behind every transition, so no white flash between screens.
  const navigationTheme = useMemo<NavigationTheme>(
    () => ({
      ...DefaultTheme,
      dark: false,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    }),
    [colors],
  );

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {accessToken ? (
        <AppStack.Navigator
          initialRouteName={devtools && CATALOG_ON_START ? "Catalog" : "MainTabs"}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <AppStack.Screen name="MainTabs" component={MainTabs} />
          <AppStack.Screen name="Profile" component={ProfileScreen} />
          <AppStack.Screen name="Categories" component={CategoriesScreen} />
          <AppStack.Screen name="Debts" component={DebtsListScreen} />
          <AppStack.Screen name="DebtDetail" component={DebtDetailScreen} />
          <AppStack.Screen name="Grocery" component={GroceryScreen} />
          <AppStack.Screen name="Vehicles" component={VehiclesListScreen} />
          <AppStack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
          <AppStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={MODAL} />
          <AppStack.Screen name="CategoryForm" component={CategoryFormScreen} options={MODAL} />
          <AppStack.Screen
            name="TransactionForm"
            component={TransactionFormScreen}
            options={MODAL}
          />
          <AppStack.Screen name="GoalForm" component={GoalFormScreen} options={MODAL} />
          <AppStack.Screen name="DebtForm" component={DebtFormScreen} options={MODAL} />
          <AppStack.Screen
            name="GroceryItemForm"
            component={GroceryItemFormScreen}
            options={MODAL}
          />
          <AppStack.Screen name="VehicleForm" component={VehicleFormScreen} options={MODAL} />
          {devtools ? (
            <>
              <AppStack.Screen name="Catalog" component={devtools.CatalogScreen} />
              <AppStack.Screen name="DesignSystem" component={devtools.DesignSystemScreen} />
              <AppStack.Screen name="Login" component={LoginScreen} />
              <AppStack.Screen name="Register" component={RegisterScreen} />
              <AppStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <AppStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            </>
          ) : null}
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
