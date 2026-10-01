import type { AdminChangelogEntry } from "@mony/shared-types";
import { StyleSheet, View } from "react-native";

import { adminNewsState, dayOf, readersLabel } from "../../lib/changelog-display";
import { formatDateDisplay } from "../../lib/date-mask";
import { radius, space, useTheme } from "../../theme";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";
import { Touchable } from "../ui/Touchable";

interface AdminNewsRowProps {
  entry: AdminChangelogEntry;
  onPress: () => void;
  testID?: string;
}

// One entry in "Gerenciar novidades" (legacy's admin table): title, what
// users see of it now (Ativa / Vencida / Inativa), when it was published
// and until when, how many read it and who wrote it.
export function AdminNewsRow({ entry, onPress, testID }: AdminNewsRowProps) {
  const { colors, elevation } = useTheme();
  const { state, label } = adminNewsState(entry);
  const tone =
    state === "active"
      ? { fg: colors.onSuccessMuted, bg: colors.successMuted }
      : state === "expired"
        ? { fg: colors.onWarningMuted, bg: colors.warningMuted }
        : { fg: colors.textMuted, bg: colors.surfaceMuted };
  const dates = entry.expiresAt
    ? `${dayOf(entry.publishedAt)} até ${formatDateDisplay(entry.expiresAt)}`
    : `Desde ${dayOf(entry.publishedAt)}`;
  const people = entry.authorName
    ? `${readersLabel(entry.readCount)} · ${entry.authorName}`
    : readersLabel(entry.readCount);
  return (
    <Touchable
      testID={testID}
      feedback="sink"
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}. ${label}. ${dates}. ${people}. Editar`}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface }, elevation("sm")]}
    >
      <View style={styles.header}>
        <Text variant="headline" style={styles.flex} numberOfLines={2}>
          {entry.title}
        </Text>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text variant="caption" color={tone.fg}>
            {label}
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Icon name="calendar-outline" size="sm" color={colors.textSubtle} />
        <Text variant="footnote" tone="muted" style={styles.flex}>
          {dates}
        </Text>
      </View>
      <View style={styles.meta}>
        <Icon name="eye-outline" size="sm" color={colors.textSubtle} />
        <Text variant="footnote" tone="muted" style={styles.flex}>
          {people}
        </Text>
        {entry.videoId ? (
          <Icon name="play-circle-outline" size="sm" color={colors.primary} />
        ) : null}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
});
