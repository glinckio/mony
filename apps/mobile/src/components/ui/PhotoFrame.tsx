import { Ionicons } from "@expo/vector-icons";
import { color, radius, size as sizeTokens } from "@mony/ui-tokens";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

interface PhotoFrameProps {
  // Remote (e.g. a signed URL) or local file URI; null shows the placeholder.
  uri: string | null;
  placeholderIcon: keyof typeof Ionicons.glyphMap;
  // "thumb": touch-target-tall list thumbnail; "full": fills the width.
  variant?: "thumb" | "full";
  accessibilityLabel?: string;
  testID?: string;
}

// 4:3 photo slot with a tokenized placeholder — vehicle photos now,
// receipts later.
export function PhotoFrame({
  uri,
  placeholderIcon,
  variant = "full",
  accessibilityLabel,
  testID,
}: PhotoFrameProps) {
  // The URI that failed to load (expired signature, unreachable host):
  // show the placeholder instead of an empty box. Keyed by URI so a fresh
  // URL from a refetch gets tried again.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const frameStyle = [styles.frame, variant === "thumb" ? styles.thumb : styles.full];

  if (!uri || uri === failedUri) {
    return (
      <View style={[frameStyle, styles.placeholder]} testID={testID}>
        <Ionicons
          name={placeholderIcon}
          size={variant === "thumb" ? sizeTokens.iconMd : sizeTokens.iconLg}
          color={color.textDisabled}
        />
      </View>
    );
  }

  return (
    <Image
      testID={testID}
      source={{ uri }}
      style={frameStyle}
      resizeMode="cover"
      // Android only resizes local files by default; remote (signed) URLs
      // would otherwise decode at full resolution even for a thumbnail.
      resizeMethod="resize"
      accessibilityLabel={accessibilityLabel}
      onError={() => setFailedUri(uri)}
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: color.surfaceAlt,
    overflow: "hidden",
  },
  thumb: {
    height: sizeTokens.touchTarget,
  },
  full: {
    width: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
});
