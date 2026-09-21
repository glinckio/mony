import { NavigationContainer, type NavigationProp } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuthStore } from "../lib/auth-store";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { HomeScreen } from "../screens/HomeScreen";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home: undefined;
};

export type AuthStackNavigation = NavigationProp<AuthStackParamList>;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return (
    <NavigationContainer>
      {accessToken ? (
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          <AppStack.Screen name="Home" component={HomeScreen} />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
