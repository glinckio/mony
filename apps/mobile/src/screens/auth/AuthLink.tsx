import { Text, Touchable } from "../../components/ui";

// Footer link of the entry screens: "Não tem uma conta? Criar conta" —
// one text (so it reads, and E2E matches it, as a single phrase), with
// the action in indigo.
export function AuthLink({
  lead,
  action,
  onPress,
  testID,
}: {
  lead: string;
  action: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Touchable
      testID={testID}
      feedback="fade"
      accessibilityRole="link"
      onPress={onPress}
      hitSlop={10}
    >
      <Text variant="callout" tone="muted" align="center">
        {lead}{" "}
        <Text variant="bodyStrong" tone="primary" inline>
          {action}
        </Text>
      </Text>
    </Touchable>
  );
}
