import Manrope400 from "@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf";
import Manrope500 from "@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf";
import Manrope600 from "@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf";
import Manrope700 from "@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf";
import Manrope800 from "@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf";
import type { tokens } from "@mony/ui-tokens";

// Only the weights design/tokens.json uses — imported file by file, since
// the package's index module would bundle every weight and italic.
// Keys match the `fontFamily` names generated into the type scale; one
// family per weight, because `fontWeight` on a custom font isn't reliable
// on Android.
export const fontAssets = {
  Manrope_400Regular: Manrope400,
  Manrope_500Medium: Manrope500,
  Manrope_600SemiBold: Manrope600,
  Manrope_700Bold: Manrope700,
  Manrope_800ExtraBold: Manrope800,
} satisfies Record<(typeof tokens.fontKeys)[number], number>;
