import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/ui/Text";
import { useAuthStore } from "../lib/auth-store";
import { radius, space, useTheme } from "../theme";

import { SIMULATED_INSETS, useDesignLab, type LabDataState } from "./design-lab";
import { DEV_TOOLS_ENABLED } from "./flags";
import { MOCK_TOKENS } from "./mock-api";

const NEXT_STATE: Record<LabDataState, LabDataState> = {
  normal: "empty",
  empty: "loading",
  loading: "error",
  error: "normal",
};

const STATE_LABEL: Record<LabDataState, string> = {
  normal: "normal",
  empty: "vazio",
  loading: "carregando",
  error: "erro",
};

// With mocks on, the dev build starts signed in as the mock user, so the
// catalog can open every app screen. Runs after the persisted session has
// been read back, so it never overwrites a real login. Turning mocks off
// signs the mock user out — its fake token must never reach the real API.
export function useDevSession() {
  useEffect(() => {
    if (!DEV_TOOLS_ENABLED) return;
    const apply = () => {
      const { useMocks } = useDesignLab.getState();
      const { accessToken, setSession, clearSession } = useAuthStore.getState();
      if (useMocks && !accessToken) setSession(MOCK_TOKENS);
      if (!useMocks && accessToken === MOCK_TOKENS.accessToken) clearSession();
    };
    const unsubscribeLab = useDesignLab.subscribe((state, previous) => {
      if (state.useMocks !== previous.useMocks) apply();
    });
    if (useAuthStore.persist.hasHydrated()) {
      apply();
      return unsubscribeLab;
    }
    const unsubscribeHydration = useAuthStore.persist.onFinishHydration(apply);
    return () => {
      unsubscribeLab();
      unsubscribeHydration();
    };
  }, []);
}

// Simulates device insets (web and the emulator have no island) and draws
// a fake status bar + island on top, so prints show the real edges.
export function DeviceFrame({ children }: { children: ReactNode }) {
  const device = useDesignLab((state) => state.device);
  const realInsets = useSafeAreaInsets();
  if (!DEV_TOOLS_ENABLED || device === "real") return <>{children}</>;
  const insets = SIMULATED_INSETS[device];
  return (
    <SafeAreaInsetsContext.Provider value={{ ...realInsets, ...insets }}>
      {children}
      <View pointerEvents="none" style={[styles.fakeStatus, { height: insets.top }]}>
        {device === "island" ? <View style={styles.island} /> : null}
      </View>
      <View pointerEvents="none" style={[styles.fakeHome, { height: insets.bottom }]}>
        <View style={device === "island" ? styles.homeIndicator : styles.gestureBar} />
      </View>
    </SafeAreaInsetsContext.Provider>
  );
}

// Small floating pill: tap → catalog; long press → cycles the data state.
export function LabPill({ onOpenCatalog }: { onOpenCatalog: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dataState = useDesignLab((state) => state.dataState);
  const set = useDesignLab((state) => state.set);
  if (!DEV_TOOLS_ENABLED) return null;
  return (
    <Pressable
      onPress={onOpenCatalog}
      onLongPress={() => set({ dataState: NEXT_STATE[dataState] })}
      accessibilityRole="button"
      accessibilityLabel={`Abrir o catálogo de telas. Estado: ${STATE_LABEL[dataState]}`}
      style={[
        styles.pill,
        {
          top: insets.top + space.xs,
          backgroundColor: colors.text,
        },
      ]}
      hitSlop={8}
    >
      <Text variant="caption" color={colors.background}>
        Lab · {STATE_LABEL[dataState]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fakeStatus: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  island: {
    width: 124,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000000",
    marginTop: 8,
  },
  fakeHome: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  homeIndicator: {
    width: 134,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#00000066",
  },
  gestureBar: {
    width: 108,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00000066",
  },
  pill: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -44 }],
    minWidth: 88,
    alignItems: "center",
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.full,
    opacity: 0.72,
    zIndex: 200,
  },
});
