import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordInputSchema, type ChangePasswordInput } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import {
  Button,
  Card,
  FormScreen,
  IconBadge,
  InlineNotice,
  Text,
  TextField,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { useToastStore } from "../../lib/toast-store";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

// Alterar senha (design/telas.md §20): three password fields in a card,
// the CTA glued above the keyboard; success goes back with a toast.
export function ChangePasswordScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordInputSchema),
    defaultValues: { currentPassword: "", newPassword: "", newPasswordConfirmation: "" },
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setSubmitError(null);
    try {
      await apiFetch<void>("/users/me/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
      haptic.success();
      useToastStore.getState().show("Senha alterada.", { tone: "success" });
      navigation.goBack();
    } catch (error) {
      haptic.error();
      if (
        error instanceof ApiError &&
        error.statusCode === 400 &&
        error.body.message.includes("Current password is incorrect.")
      ) {
        setError("currentPassword", { type: "manual", message: "Senha atual incorreta." });
      } else {
        setSubmitError("Algo deu errado. Tente novamente.");
      }
    }
  };

  return (
    <FormScreen
      title="Alterar senha"
      onClose={() => navigation.goBack()}
      footer={
        <>
          {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}
          <Button
            testID="submit-button"
            label="Alterar senha"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </>
      }
    >
      <View style={styles.intro}>
        <IconBadge icon="lock-closed" size={56} filled />
        <Text variant="callout" tone="muted" style={styles.flex}>
          Informe sua senha atual e escolha uma nova, com pelo menos 8 caracteres.
        </Text>
      </View>

      <Card style={styles.card}>
        <Controller
          control={control}
          name="currentPassword"
          render={({ field }) => (
            <TextField
              testID="current-password-input"
              label="Senha atual"
              value={field.value}
              onChangeText={field.onChange}
              secureToggle
              textContentType="password"
              error={errors.currentPassword?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="newPassword"
          render={({ field }) => (
            <TextField
              testID="new-password-input"
              label="Nova senha"
              value={field.value}
              onChangeText={field.onChange}
              secureToggle
              textContentType="newPassword"
              error={errors.newPassword?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="newPasswordConfirmation"
          render={({ field }) => (
            <TextField
              testID="new-password-confirmation-input"
              label="Confirmar nova senha"
              value={field.value}
              onChangeText={field.onChange}
              secureToggle
              textContentType="newPassword"
              error={errors.newPasswordConfirmation?.message}
            />
          )}
        />
      </Card>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
  },
  flex: {
    flex: 1,
  },
  card: {
    gap: space.lg,
  },
});
