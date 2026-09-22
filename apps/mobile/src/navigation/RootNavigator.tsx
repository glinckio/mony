import { Ionicons } from "@expo/vector-icons";
import type { Category, Goal, Profile, Transaction } from "@mony/shared-types";
import { color } from "@mony/ui-tokens";
import { createBottomTabNavigator, type BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  NavigationContainer,
  type CompositeNavigationProp,
  type NavigationProp,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";

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
import { GoalFormScreen } from "../screens/goals/GoalFormScreen";
import { GoalsScreen } from "../screens/goals/GoalsScreen";
import { ChangePasswordScreen } from "../screens/profile/ChangePasswordScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { TransactionFormScreen } from "../screens/transactions/TransactionFormScreen";
import { TransactionsListScreen } from "../screens/transactions/TransactionsListScreen";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Categories: undefined;
  Goals: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  ChangePassword: undefined;
  CategoryForm: { category?: Category } | undefined;
  TransactionForm: { transaction?: Transaction } | undefined;
  GoalForm: { goal?: Goal } | undefined;
};

export type AuthStackNavigation = NavigationProp<AuthStackParamList>;
export type AppStackNavigation = NavigationProp<AppStackParamList>;

// Screens living inside the tab navigator need to reach both sibling
// tabs and the stack-level modal routes (e.g. Categories -> CategoryForm)
// — React Navigation resolves an unmatched route name by searching up
// the navigator tree at runtime, but the type needs to know about both
// param lists for that to type-check.
export type MainTabNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NavigationProp<AppStackParamList>
>;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  Transactions: "swap-horizontal-outline",
  Categories: "pricetags-outline",
  Goals: "flag-outline",
  Profile: "person-outline",
};

function MainTabs() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.textSecondary,
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.border },
        tabBarIcon: ({ color: tintColor, size }) => (
          <Ionicons name={TAB_ICONS[route.name as keyof MainTabParamList]} size={size} color={tintColor} />
        ),
      })}
    >
      <MainTab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ title: "Início", tabBarButtonTestID: "tab-home" }}
      />
      <MainTab.Screen
        name="Transactions"
        component={TransactionsListScreen}
        options={{ title: "Transações", tabBarButtonTestID: "tab-transactions" }}
      />
      <MainTab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ title: "Categorias", tabBarButtonTestID: "tab-categories" }}
      />
      <MainTab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ title: "Metas", tabBarButtonTestID: "tab-goals" }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Perfil", tabBarButtonTestID: "tab-profile" }}
      />
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);

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
        // Best-effort — the workspace switcher just stays unset until
        // the next successful fetch.
      });
  }, [userId, setActiveWorkspace]);

  return (
    <NavigationContainer>
      {accessToken ? (
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          <AppStack.Screen name="MainTabs" component={MainTabs} />
          <AppStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <AppStack.Screen
            name="CategoryForm"
            component={CategoryFormScreen}
            options={{ presentation: "modal" }}
          />
          <AppStack.Screen
            name="TransactionForm"
            component={TransactionFormScreen}
            options={{ presentation: "modal" }}
          />
          <AppStack.Screen
            name="GoalForm"
            component={GoalFormScreen}
            options={{ presentation: "modal" }}
          />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
