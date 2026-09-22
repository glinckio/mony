import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";

// The bottom tab bar keeps every tab's screen mounted, so switching
// tabs doesn't remount them the way a stack push/pop used to — a
// screen's data can go stale while another tab is focused (e.g. create
// a transaction, switch to Início, see last period's numbers). Skips
// the very first focus (right after mount) since the screen's own
// initial query already covers that.
export function useRefetchOnFocus(refetch: () => void): void {
  const isFirstFocus = useRef(true);
  // Kept in a ref so the `useFocusEffect` callback below can stay
  // referentially stable (empty deps) without ever calling a stale
  // `refetch` closure from an earlier render.
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetchRef.current();
    }, []),
  );
}
