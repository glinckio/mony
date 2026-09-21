import type { Category, Goal, Profile, Transaction } from "@mony/shared-types";
import { NavigationContainer, type NavigationProp } from "@react-navigation/native";
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
import { GoalFormScreen } from "../screens/goals/GoalFormScreen";
import { GoalsScreen } from "../screens/goals/GoalsScreen";
import { HomeScreen } from "../screens/HomeScreen";
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

export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Categories: undefined;
  CategoryForm: { category?: Category } | undefined;
  Transactions: undefined;
  TransactionForm: { transaction?: Transaction } | undefined;
  Goals: undefined;
  GoalForm: { goal?: Goal } | undefined;
};

export type AuthStackNavigation = NavigationProp<AuthStackParamList>;
export type AppStackNavigation = NavigationProp<AppStackParamList>;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

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
          <AppStack.Screen name="Home" component={HomeScreen} />
          <AppStack.Screen name="Profile" component={ProfileScreen} />
          <AppStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <AppStack.Screen name="Categories" component={CategoriesScreen} />
          <AppStack.Screen
            name="CategoryForm"
            component={CategoryFormScreen}
            options={{ presentation: "modal" }}
          />
          <AppStack.Screen name="Transactions" component={TransactionsListScreen} />
          <AppStack.Screen
            name="TransactionForm"
            component={TransactionFormScreen}
            options={{ presentation: "modal" }}
          />
          <AppStack.Screen name="Goals" component={GoalsScreen} />
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
