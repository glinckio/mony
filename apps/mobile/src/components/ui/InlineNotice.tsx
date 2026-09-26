import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { radius, space, useMotion, useTheme, type Theme } from "../../theme";

import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Text, type TextTone } from "./Text";

export type NoticeTone = "neutral" | "success" | "warning" | "danger";

interface InlineNoticeProps {
  tone: NoticeTone;
  message: string;
  title?: string;
  action?: { label: string; onPress: () => void; testID?: string };
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TONES: Record<
  NoticeTone,
  {
    icon: IconName;
    text: TextTone;
    background: (colors: Theme["colors"]) => string;
    ink: (colors: Theme["colors"]) => string;
  }
> = {
  neutral: {
    icon: "information-circle",
    text: "onPrimaryMuted",
    background: (colors) => colors.primaryMuted,
    ink: (colors) => colors.onPrimaryMuted,
  },
  success: {
    icon: "checkmark-circle",
    text: "onSuccessMuted",
    background: (colors) => colors.successMuted,
    ink: (colors) => colors.onSuccessMuted,
  },
  warning: {
    icon: "alert-circle",
    text: "onWarningMuted",
    background: (colors) => colors.warningMuted,
    ink: (colors) => colors.onWarningMuted,
  },
  danger: {
    icon: "alert-circle",
    text: "onDangerMuted",
    background: (colors) => colors.dangerMuted,
    ink: (colors) => colors.onDangerMuted,
  },
};

// A message that stays in place until it's resolved: form submit errors,
// "you need a category first", "code sent". Announced when it appears.
export function InlineNotice({ tone, message, title, action, style, testID }: InlineNoticeProps) {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const spec = TONES[tone];
  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(220)}
      exiting={reduced ? undefined : FadeOut.duration(160)}
      testID={testID}
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: spec.background(colors) }, style]}
    >
      <View style={styles.row}>
        <Icon name={spec.icon} size="md" color={spec.ink(colors)} />
        <View style={styles.text}>
          {title ? (
            <Text variant="subhead" tone={spec.text}>
              {title}
            </Text>
          ) : null}
          <Text variant="footnote" tone={spec.text}>
            {message}
          </Text>
        </View>
      </View>
      {action ? (
        <Button
          testID={action.testID}
          label={action.label}
          onPress={action.onPress}
          variant="secondary"
          size="sm"
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    padding: space.md,
    gap: space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
  },
  text: {
    flex: 1,
    gap: space.xxs,
  },
  action: {
    marginLeft: space["2xl"] + space.xs,
  },
});
