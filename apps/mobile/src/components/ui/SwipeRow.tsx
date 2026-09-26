import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { radius, space, useTheme } from "../../theme";

import { Icon } from "./Icon";
import { Text } from "./Text";

interface SwipeRowProps {
  children: ReactNode;
  // Revealed by swiping left; undefined disables the swipe.
  onDelete?: () => void;
  // Temporarily disables the swipe without remounting the row (e.g. while
  // a list is in multi-selection mode).
  enabled?: boolean;
  deleteLabel: string;
  deleteTestID?: string;
}

// A card row that reveals a red "Excluir" action when swiped left. The
// same action must also be offered as an accessibility action on the row.
export function SwipeRow({
  children,
  onDelete,
  enabled = true,
  deleteLabel,
  deleteTestID,
}: SwipeRowProps) {
  const { colors } = useTheme();
  if (!onDelete) return <>{children}</>;
  return (
    <ReanimatedSwipeable
      enabled={enabled}
      friction={2}
      rightThreshold={48}
      overshootRight={false}
      containerStyle={styles.container}
      renderRightActions={(_progress, _translation, methods) => (
        // A plain Pressable: this action is mounted (hidden) for every row,
        // so it stays free of animated styles.
        <Pressable
          testID={deleteTestID}
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
          onPress={() => {
            methods.close();
            onDelete();
          }}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: colors.danger, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Icon name="trash-outline" size="lg" color={colors.onDanger} />
          <Text variant="caption" color={colors.onDanger}>
            Excluir
          </Text>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
  },
  action: {
    width: 88,
    marginLeft: space.sm,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xxs,
  },
});
