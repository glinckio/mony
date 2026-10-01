import { youtubeWatchUrl, type ChangelogEntry } from "@mony/shared-types";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

import { dayOf, moreUnreadNote, readLabel, unreadCountLabel } from "../../lib/changelog-display";
import { radius, space, useTheme } from "../../theme";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { InlineNotice } from "../ui/InlineNotice";
import { PaperSheet } from "../ui/PaperSheet";
import { Gradient, IconBadge } from "../ui/Surfaces";
import { Text } from "../ui/Text";
import { Touchable } from "../ui/Touchable";

interface NewsSheetProps {
  visible: boolean;
  entry: ChangelogEntry | null;
  // How many are unread, this one included (Início): "N novas" and the
  // "Há mais…" note.
  unreadCount?: number;
  // Present while unread: "Marcar como lida".
  onMarkRead?: () => void;
  marking?: boolean;
  // A failure to show inside the sheet: a toast would sit behind it.
  error?: string | null;
  onClose: () => void;
  testID?: string;
}

// One "Novidade" on a sheet (Início's popup and the history): megaphone
// badge, "N novas", the title, the day it was published, the video card
// (opens YouTube only when tapped), the text as plain text, and legacy's
// "Marcar como lida" / "Fechar".
export function NewsSheet({
  visible,
  entry,
  unreadCount = 0,
  onMarkRead,
  marking = false,
  error = null,
  onClose,
  testID = "news-sheet",
}: NewsSheetProps) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const [browserError, setBrowserError] = useState(false);
  const countLabel = unreadCountLabel(unreadCount);
  const note = moreUnreadNote(unreadCount);
  const videoUrl = entry?.videoId ? youtubeWatchUrl(entry.videoId) : null;
  const notice = error ?? (browserError ? "Não deu para abrir o vídeo. Tente de novo." : null);
  const close = () => {
    setBrowserError(false);
    onClose();
  };

  return (
    <PaperSheet visible={visible} onClose={close} dismissible={!marking} testID={testID}>
      {entry ? (
        <View style={styles.container}>
          <ScrollView style={{ maxHeight: height * 0.55 }} contentContainerStyle={styles.body}>
            <View style={styles.header}>
              <IconBadge icon="megaphone-outline" size={40} />
              <Text variant="label" tone="muted" style={styles.flex}>
                Novidade
              </Text>
              {countLabel ? (
                <View style={[styles.pill, { backgroundColor: colors.primaryMuted }]}>
                  <Text variant="caption" color={colors.primary}>
                    {countLabel}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.titleBlock}>
              <Text variant="title2" accessibilityRole="header">
                {entry.title}
              </Text>
              <Text variant="footnote" tone="muted">
                {entry.readAt
                  ? `${dayOf(entry.publishedAt)} · ${readLabel(entry.readAt)}`
                  : dayOf(entry.publishedAt)}
              </Text>
            </View>
            {videoUrl ? (
              <VideoCard
                onPress={() => {
                  setBrowserError(false);
                  WebBrowser.openBrowserAsync(videoUrl).catch(() => setBrowserError(true));
                }}
              />
            ) : null}
            {/* Plain text only (never HTML); line breaks are kept. */}
            <Text variant="body" testID={`${testID}-text`}>
              {entry.description}
            </Text>
            {note ? (
              <Text variant="footnote" tone="muted">
                {note}
              </Text>
            ) : null}
          </ScrollView>
          <View style={styles.actions}>
            {notice ? (
              <InlineNotice testID={`${testID}-error`} tone="danger" message={notice} />
            ) : null}
            {onMarkRead ? (
              <Button
                testID={`${testID}-mark-read`}
                label="Marcar como lida"
                leftIcon="checkmark"
                loading={marking}
                onPress={onMarkRead}
              />
            ) : null}
            <Button
              testID={`${testID}-close`}
              label="Fechar"
              variant={onMarkRead ? "ghost" : "secondary"}
              disabled={marking}
              onPress={close}
            />
          </View>
        </View>
      ) : null}
    </PaperSheet>
  );
}

// The video as a card in the brand gradient — nothing is loaded from
// YouTube until the user taps it (no thumbnail: that would reach YouTube
// for everyone who opens the app).
function VideoCard({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Touchable
      testID="news-video"
      feedback="sink"
      accessibilityRole="link"
      accessibilityLabel="Assistir o vídeo no YouTube"
      onPress={onPress}
    >
      <Gradient name="brand" style={styles.video}>
        <View
          style={[
            styles.play,
            { backgroundColor: colors.glassFill, borderColor: colors.glassBorder },
          ]}
        >
          <Icon name="play" size="lg" color={colors.onGlass} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong" color={colors.onGlass}>
            Assistir no YouTube
          </Text>
          <Text variant="footnote" color={colors.onGlassMuted}>
            Abre o vídeo no navegador
          </Text>
        </View>
      </Gradient>
    </Touchable>
  );
}

const PLAY_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  body: {
    gap: space.lg,
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
  titleBlock: {
    gap: space.xxs,
  },
  video: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  play: {
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    gap: space.xs,
  },
});
