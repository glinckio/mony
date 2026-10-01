import type { ChangelogEntry } from "@mony/shared-types";
import { StyleSheet, View } from "react-native";

import { dayOf, excerpt, readLabel } from "../../lib/changelog-display";
import { radius, space, useTheme } from "../../theme";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";
import { Touchable } from "../ui/Touchable";

interface NewsCardProps {
  entry: ChangelogEntry;
  onPress: () => void;
  testID?: string;
}

// One "Novidade" in the history (legacy's cards): unread ones carry a
// "Nova" pill and an indigo edge, read ones say when; the title, the day
// and a two-line preview of the text.
export function NewsCard({ entry, onPress, testID }: NewsCardProps) {
  const { colors, elevation } = useTheme();
  const unread = !entry.readAt;
  const status = unread ? "Nova" : readLabel(entry.readAt!);
  return (
    <Touchable
      testID={testID}
      feedback="sink"
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}. ${status}. ${dayOf(entry.publishedAt)}`}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: unread ? colors.primary : colors.surface,
        },
        elevation("sm"),
      ]}
    >
      <View style={styles.header}>
        <Text variant="footnote" tone="muted" style={styles.flex}>
          {dayOf(entry.publishedAt)}
        </Text>
        {unread ? (
          <View style={[styles.pill, { backgroundColor: colors.primary }]}>
            <Text variant="caption" color={colors.onPrimary}>
              Nova
            </Text>
          </View>
        ) : (
          <View style={styles.read}>
            <Icon name="checkmark-circle-outline" size="sm" color={colors.success} />
            <Text variant="caption" tone="muted">
              {status}
            </Text>
          </View>
        )}
      </View>
      <Text variant="headline">{entry.title}</Text>
      <Text variant="callout" tone="muted" numberOfLines={2}>
        {excerpt(entry.description)}
      </Text>
      {entry.videoId ? (
        <View style={styles.read}>
          <Icon name="play-circle-outline" size="sm" color={colors.primary} />
          <Text variant="caption" color={colors.primary}>
            Tem vídeo
          </Text>
        </View>
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  pill: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.full,
  },
  read: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
});
