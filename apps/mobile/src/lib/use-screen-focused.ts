import { NavigationContext } from "@react-navigation/native";
import { useContext, useEffect, useState } from "react";

// Whether the screen this component lives in is focused — without
// requiring a navigator (true outside one, e.g. in tests or the catalog).
export function useScreenFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) return;
    const offFocus = navigation.addListener("focus", () => setFocused(true));
    const offBlur = navigation.addListener("blur", () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  return focused;
}
