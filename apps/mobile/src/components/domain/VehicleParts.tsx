import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";

import { radius, space, useMotion, useTheme } from "../../theme";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";

// Photos are signed MinIO URLs that expire (1 h) — a cached one can fail
// to load. The failed URI falls back to the placeholder; keyed by URI so a
// fresh URL from a refetch is tried again.
function useLoadableUri(uri: string | null) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return {
    uri: uri && uri !== failedUri ? uri : null,
    onError: () => setFailedUri(uri),
  };
}

// The vehicle's photo (signed URL) or, without one, a lavender slot with a
// car glyph. `aspect` 4:3 like the picker's crop.
export function VehiclePhoto({
  uri,
  size = "full",
  accessibilityLabel,
  testID,
  style,
}: {
  uri: string | null;
  size?: "thumb" | "full";
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const photo = useLoadableUri(uri);
  const frame = size === "thumb" ? styles.thumb : styles.full;
  if (!photo.uri) {
    return (
      <View
        testID={testID}
        style={[frame, styles.placeholder, { backgroundColor: colors.primaryMuted }, style]}
      >
        <Icon name="car-sport" size={size === "thumb" ? "lg" : 48} color={colors.primary} />
      </View>
    );
  }
  return (
    <View style={[frame, styles.clip, style]}>
      <Image
        testID={testID}
        source={{ uri: photo.uri }}
        resizeMode="cover"
        // Android only resizes local files by default; remote (signed) URLs
        // would otherwise decode at full resolution even for a thumbnail.
        resizeMethod="resize"
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
        onError={photo.onError}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// The vehicle detail's hero: the photo bleeding to the top edge under a
// shade that keeps the status bar and round buttons legible — or, without
// a photo (or when it fails to load), the balance gradient with the car.
export function VehicleHero({
  photoUrl,
  name,
  height,
  testID,
}: {
  photoUrl: string | null;
  // The vehicle's name; undefined while it hasn't loaded.
  name?: string;
  height: number;
  testID?: string;
}) {
  const { colors, gradients } = useTheme();
  const photo = useLoadableUri(photoUrl);
  return (
    <View style={[styles.hero, { height }]}>
      {photo.uri ? (
        <>
          <Image
            testID={testID}
            source={{ uri: photo.uri }}
            resizeMode="cover"
            accessible
            accessibilityLabel={name ? `Foto de ${name}` : "Foto do veículo"}
            onError={photo.onError}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[colors.overlay, "transparent"]}
            style={styles.topShade}
            pointerEvents="none"
          />
        </>
      ) : (
        <LinearGradient
          testID={name ? testID : undefined}
          colors={gradients.balance}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.heroEmpty]}
        >
          <View
            style={[
              styles.carBadge,
              { backgroundColor: colors.glassFill, borderColor: colors.glassBorder },
            ]}
          >
            <Icon name="car-sport" size={56} color={colors.onGlass} />
          </View>
          {name ? (
            <Text variant="subhead" color={colors.onGlassMuted}>
              Sem foto ainda
            </Text>
          ) : null}
        </LinearGradient>
      )}
    </View>
  );
}

// The Brazilian Mercosul plate: white plate, blue band on top, the
// characters in wide heavy capitals.
export function MercosulPlate({ plate, size = "md" }: { plate: string; size?: "sm" | "md" }) {
  const { colors } = useTheme();
  const small = size === "sm";
  return (
    <View
      accessible
      accessibilityLabel={`Placa ${plate.split("").join(" ")}`}
      style={[
        styles.plate,
        small ? styles.plateSmall : null,
        { borderColor: colors.text, backgroundColor: colors.surface },
      ]}
    >
      <View
        style={[styles.band, small ? styles.bandSmall : null, { backgroundColor: colors.primary }]}
      />
      <Text
        variant={small ? "caption" : "headline"}
        style={[styles.plateText, small ? styles.plateTextSmall : null]}
        numberOfLines={1}
      >
        {plate}
      </Text>
    </View>
  );
}

// The mileage as an odometer: each digit in its own window; digits that
// change roll up into place. Reads as "36.200 km" (the dot sits between
// windows), which is also its accessible label.
export function Odometer({ km, testID }: { km: number; testID?: string }) {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const text = km.toLocaleString("pt-BR");
  return (
    <View testID={testID} style={styles.odometer} accessible accessibilityLabel={`${text} km`}>
      {text.split("").map((char, index) =>
        /\d/.test(char) ? (
          <View key={`${index}-${char}`} style={[styles.window, { backgroundColor: colors.text }]}>
            <Animated.View entering={reduced ? undefined : SlideInDown.duration(260)}>
              <Text variant="odometer" color={colors.surface}>
                {char}
              </Text>
            </Animated.View>
          </View>
        ) : (
          <Text key={`${index}-${char}`} variant="odometer" tone="muted">
            {char}
          </Text>
        ),
      )}
      <Text variant="headline" tone="muted" style={styles.unit}>
        {" km"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 88,
    height: 66,
    borderRadius: radius.md,
  },
  full: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  clip: {
    overflow: "hidden",
  },
  hero: {
    width: "100%",
    borderBottomLeftRadius: radius.xl + 8,
    borderBottomRightRadius: radius.xl + 8,
    overflow: "hidden",
  },
  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroEmpty: {
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  carBadge: {
    width: 104,
    height: 104,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  plate: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderRadius: radius.xs,
    overflow: "hidden",
    minWidth: 112,
    alignItems: "center",
  },
  plateSmall: {
    minWidth: 76,
    borderWidth: 1,
  },
  band: {
    alignSelf: "stretch",
    height: 7,
  },
  bandSmall: {
    height: 4,
  },
  plateText: {
    letterSpacing: 2,
    fontFamily: "Manrope_800ExtraBold",
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  plateTextSmall: {
    letterSpacing: 1,
    paddingHorizontal: space.xs,
    paddingVertical: 0,
  },
  odometer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  window: {
    minWidth: 26,
    height: 36,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  unit: {
    marginLeft: space.xs,
  },
});
