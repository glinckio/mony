import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppToast } from "./components/ui";
import { DEV_TOOLS_ENABLED } from "./dev/flags";
import { queryClient } from "./lib/query-client";
import { RootNavigator, navigationRef } from "./navigation/RootNavigator";
import { ThemeProvider, useTheme } from "./theme";
import { fontAssets } from "./theme/fonts";

// DesignLab pill, device simulation, mock session: dev builds only.
const devtools: typeof import("./dev/devtools") | null =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  __DEV__ && DEV_TOOLS_ENABLED ? require("./dev/devtools") : null;

// Keep the native splash (paper + the "M") up until the fonts are in, so
// the first screen never flashes white or swaps typefaces.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <ThemeProvider>
              <AppShell />
            </ThemeProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { colors } = useTheme();
  devtools?.useDevSession();

  // The window behind everything follows the theme (no white edges on
  // transitions or while the keyboard animates).
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  const content = (
    <>
      <StatusBar style="dark" />
      <RootNavigator />
      <AppToast />
      {devtools ? (
        <devtools.LabPill
          onOpenCatalog={() => {
            // The catalog lives on the signed-in stack only.
            if (
              navigationRef.isReady() &&
              navigationRef.getRootState()?.routeNames.includes("Catalog")
            ) {
              navigationRef.navigate("Catalog");
            }
          }}
        />
      ) : null}
    </>
  );

  return devtools ? <devtools.DeviceFrame>{content}</devtools.DeviceFrame> : content;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
