import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";

import { StatusPill } from "../components/domain";
import {
  Button,
  Card,
  Icon,
  Rule,
  ScrollScreen,
  SegmentedControl,
  Text,
  Touchable,
} from "../components/ui";
import type { AppStackNavigation, MainTabParamList } from "../navigation/RootNavigator";
import { space, useTheme } from "../theme";

import { useDesignLab, type LabDataState, type LabDevice, type LabMotion } from "./design-lab";
import { SCREENS, type CatalogEntry, type ScreenFlow } from "./screens";

const FLOWS: ScreenFlow[] = ["Dev", "Núcleo", "Entrada", "Casa", "Conta"];

// Dev-only Screen Catalog: every screen of the app through the real
// navigation, with the DesignLab controls (data state, motion, simulated
// device, mock/real backend) on top.
export function CatalogScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const lab = useDesignLab();
  const ready = SCREENS.filter((screen) => screen.status === "Pronta").length;

  // New data state or backend: every cached query refetches from it.
  const setData = (patch: { dataState?: LabDataState; useMocks?: boolean }) => {
    lab.set(patch);
    void queryClient.resetQueries();
  };

  const open = (entry: CatalogEntry) => {
    if (entry.tab) {
      navigation.navigate("MainTabs", { screen: entry.tab as keyof MainTabParamList });
      return;
    }
    // Catalog routes are all registered on the app stack in dev builds.
    (navigation.navigate as (route: string, params?: object) => void)(entry.route, entry.params);
  };

  return (
    <ScrollScreen
      title="Catálogo de telas"
      largeTitle={{
        eyebrow: `DesignLab · ${ready} de ${SCREENS.length} prontas`,
        title: "Catálogo de telas",
      }}
    >
      <Card style={styles.controls}>
        <Control label="Estado">
          <SegmentedControl<LabDataState>
            size="sm"
            testID="lab-state"
            value={lab.dataState}
            onChange={(dataState) => setData({ dataState })}
            options={[
              { value: "normal", label: "Normal" },
              { value: "empty", label: "Vazio" },
              { value: "loading", label: "Carregando" },
              { value: "error", label: "Erro" },
            ]}
          />
        </Control>
        <Control label="Movimento">
          <SegmentedControl<LabMotion>
            size="sm"
            value={lab.motion}
            onChange={(motion) => lab.set({ motion })}
            options={[
              { value: "system", label: "Sistema" },
              { value: "reduced", label: "Reduzido" },
            ]}
          />
        </Control>
        <Control label="Aparelho">
          <SegmentedControl<LabDevice>
            size="sm"
            value={lab.device}
            onChange={(device) => lab.set({ device })}
            options={[
              { value: "real", label: "Real" },
              { value: "island", label: "iPhone ilha" },
              { value: "android", label: "Android" },
            ]}
          />
        </Control>
        <Control label="Dados">
          <SegmentedControl<"mock" | "api">
            size="sm"
            value={lab.useMocks ? "mock" : "api"}
            onChange={(source) => setData({ useMocks: source === "mock" })}
            options={[
              { value: "mock", label: "Mock" },
              { value: "api", label: "API real" },
            ]}
          />
        </Control>
      </Card>

      <Button
        label="Abrir o app (fluxo normal)"
        variant="secondary"
        leftIcon="open-outline"
        onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
      />

      {FLOWS.map((flow) => (
        <View key={flow} style={styles.group}>
          <Text variant="overline" tone="muted">
            {flow}
          </Text>
          <Card padded={false} style={styles.list}>
            {SCREENS.filter((screen) => screen.flow === flow).map((screen) => (
              <CatalogRow key={screen.id} entry={screen} onPress={() => open(screen)} />
            ))}
          </Card>
        </View>
      ))}
    </ScrollScreen>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.control}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

function CatalogRow({ entry, onPress }: { entry: CatalogEntry; onPress: () => void }) {
  const { colors } = useTheme();
  const pending = entry.status === "Pendente";
  return (
    <>
      <Touchable
        feedback="row"
        disabled={pending}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${entry.name}, ${entry.status}`}
        accessibilityState={{ disabled: pending }}
        style={[styles.row, pending && styles.rowPending]}
      >
        <View style={styles.rowText}>
          <Text variant="bodyStrong">{entry.name}</Text>
          <Text variant="footnote" tone="muted">
            {entry.tab ? `MainTabs › ${entry.tab}` : entry.route}
          </Text>
        </View>
        {entry.status === "Pronta" ? (
          <StatusPill kind="done" />
        ) : (
          <Text variant="caption" tone={pending ? "subtle" : "warning"}>
            {entry.status}
          </Text>
        )}
        {!pending ? <Icon name="chevron-forward" size="md" color={colors.textMuted} /> : null}
      </Touchable>
      <Rule />
    </>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: space.md,
    marginBottom: space.xl,
  },
  list: {
    paddingHorizontal: space.lg,
  },
  control: {
    gap: space.xxs,
  },
  group: {
    marginTop: space["2xl"],
    gap: space.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 56,
    paddingVertical: space.sm,
  },
  rowPending: {
    opacity: 0.5,
  },
  rowText: {
    flex: 1,
    gap: space.xxs,
  },
});
