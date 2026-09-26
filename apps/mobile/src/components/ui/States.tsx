import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { space, useMotion } from "../../theme";
import type { ImageKey } from "../../theme/images";

import { AppImage } from "./AppImage";
import { Button } from "./Button";
import { type IconName } from "./Icon";
import { IconBadge } from "./Surfaces";
import { Text } from "./Text";

interface EmptyStateProps {
  title: string;
  message?: string;
  // Illustration slot; `icon` (in a large pastel badge) stands in for it in
  // release builds until the image exists.
  image?: ImageKey;
  icon?: IconName;
  action?: { label: string; onPress: () => void; testID?: string };
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Empty state in the app's voice: what's missing and the action that
// fixes it — never a gray icon + "Nada aqui".
export function EmptyState({
  title,
  message,
  image,
  icon = "document-text-outline",
  action,
  compact = false,
  style,
  testID,
}: EmptyStateProps) {
  const { reduced } = useMotion();
  const fallback = <InkIcon name={icon} />;
  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(260)}
      style={[styles.container, compact && styles.compact, style]}
      testID={testID}
    >
      {!compact ? image ? <AppImage name={image} fallback={fallback} /> : fallback : null}
      <View style={styles.copy}>
        <Text variant={compact ? "headline" : "title2"} align={compact ? "left" : "center"}>
          {title}
        </Text>
        {message ? (
          <Text variant="callout" tone="muted" align={compact ? "left" : "center"}>
            {message}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Button
          testID={action.testID}
          label={action.label}
          onPress={action.onPress}
          variant={compact ? "secondary" : "primary"}
          size={compact ? "sm" : "md"}
          fullWidth={false}
          style={compact ? undefined : styles.centered}
        />
      ) : null}
    </Animated.View>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

// The screen-level error: human cause + "Tentar de novo". The body keeps
// the app's generic pt-BR copy (never the API's message).
export function ErrorState({
  message = "Algo deu errado. Tente novamente.",
  onRetry,
  compact = false,
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact, style]} accessibilityRole="alert">
      {!compact ? <InkIcon name="cloud-offline-outline" /> : null}
      <View style={styles.copy}>
        <Text variant={compact ? "headline" : "title2"} align={compact ? "left" : "center"}>
          Não consegui falar com o Mony agora.
        </Text>
        <Text variant="callout" tone="muted" align={compact ? "left" : "center"}>
          {message}
        </Text>
      </View>
      {onRetry ? (
        <Button
          testID="retry-button"
          label="Tentar de novo"
          leftIcon="refresh"
          variant="secondary"
          size={compact ? "sm" : "md"}
          fullWidth={false}
          onPress={onRetry}
          style={compact ? undefined : styles.centered}
        />
      ) : null}
    </View>
  );
}

function InkIcon({ name }: { name: IconName }) {
  return <IconBadge icon={name} size={88} />;
}

// Something that loads inside content (not a whole screen) — a short
// placeholder row set to the silhouette passed as children.
export function LoadingBlock({ children }: { children: ReactNode }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Carregando" style={styles.loading}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: space.xl,
    paddingVertical: space["4xl"],
    paddingHorizontal: space.xl,
  },
  compact: {
    alignItems: "flex-start",
    gap: space.md,
    paddingVertical: space.lg,
    paddingHorizontal: 0,
  },
  copy: {
    gap: space.sm,
    alignSelf: "stretch",
  },
  centered: {
    alignSelf: "center",
  },
  loading: {
    gap: space.md,
  },
});
