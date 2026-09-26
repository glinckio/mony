import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
  type BottomTabNavigationOptions,
} from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useContext, useEffect, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";

import { layout, radius, space, useTheme } from "../../theme";

import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";
import { Touchable } from "./Touchable";

export interface AppTabBarProps extends BottomTabBarProps {
  // Icon per route name (outline glyph; the active tab shows it filled).
  icons: Record<string, IconName>;
  // The loop's main action: the raised gradient "+" in the middle.
  launch: { accessibilityLabel: string; onPress: () => void; testID?: string };
}

// The app's own tab bar (design/componentes.md → Chrome): white bar with
// rounded top corners and a soft shadow, four tabs and the raised
// gradient "+" in the middle. The active tab turns indigo with its filled
// icon. Hidden while the keyboard is open; floats over the screens, which
// pad their content by its height.
export function AppTabBar({
  state,
  descriptors,
  navigation,
  insets,
  icons,
  launch,
}: AppTabBarProps) {
  const { colors, gradients, elevation } = useTheme();
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const tabs = state.routes.map((route, index) => {
    const options: BottomTabNavigationOptions = descriptors[route.key]?.options ?? {};
    const focused = state.index === index;
    const label = typeof options.title === "string" ? options.title : route.name;
    const tint = focused ? colors.primary : colors.textSubtle;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };

    return (
      <Touchable
        key={route.key}
        testID={options.tabBarButtonTestID}
        feedback="fade"
        haptic="selection"
        accessibilityRole="tab"
        accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
        accessibilityState={{ selected: focused }}
        onPress={onPress}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
        style={styles.tab}
      >
        <Icon
          name={icons[route.name] ?? "ellipse-outline"}
          size="lg"
          filled={focused}
          color={tint}
        />
        <Text variant="caption" color={tint} numberOfLines={1}>
          {label}
        </Text>
      </Touchable>
    );
  });

  const middle = Math.ceil(tabs.length / 2);

  return (
    <View
      onLayout={(event) => reportHeight?.(event.nativeEvent.layout.height)}
      accessibilityRole="tablist"
      // Hidden (not unmounted) while typing: remounting the whole bar on
      // every keyboard show/hide is wasted work.
      pointerEvents={keyboardOpen ? "none" : "auto"}
      accessibilityElementsHidden={keyboardOpen}
      importantForAccessibility={keyboardOpen ? "no-hide-descendants" : "auto"}
      style={[
        styles.bar,
        { paddingBottom: insets.bottom, backgroundColor: colors.chrome },
        elevation("lg"),
        keyboardOpen && styles.hidden,
      ]}
    >
      <View style={styles.row}>
        {tabs.slice(0, middle)}
        <View style={styles.launchSlot}>
          <Touchable
            testID={launch.testID}
            feedback="sink"
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel={launch.accessibilityLabel}
            onPress={launch.onPress}
            style={[styles.launch, elevation("md"), { shadowColor: colors.primary }]}
          >
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.launchFill]}
            />
            <Icon name="add" size={30} color={colors.onPrimary} />
          </Touchable>
        </View>
        {tabs.slice(middle)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  row: {
    height: layout.tabBarHeight,
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: space.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: layout.touchTarget,
  },
  launchSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  launch: {
    width: 56,
    height: 56,
    marginTop: -24,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  launchFill: {
    borderRadius: radius.full,
  },
});
