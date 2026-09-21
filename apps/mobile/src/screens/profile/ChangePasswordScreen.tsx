import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordInputSchema, type ChangePasswordInput } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Button, Screen, Text, TextField } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import type { AppStackNavigation } from "../../navigation/RootNavigator";

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
      navigation.goBack();
    } catch (error) {
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
    <Screen>
      <View style={styles.header}>
        <Text variant="heading">Alterar senha</Text>
        <TouchableOpacity
          testID="header-close"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close-outline" size={sizeTokens.iconLg} color={color.textPrimary} />
        </TouchableOpacity>
      </View>
      <Text variant="caption" style={styles.subtitle}>
        Informe sua senha atual e a nova senha.
      </Text>

      <View style={styles.form}>
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
              error={errors.newPasswordConfirmation?.message}
            />
          )}
        />
      </View>

      {submitError && (
        <View style={styles.submitError}>
          <Ionicons name="alert-circle-outline" size={sizeTokens.iconSm} color={color.danger} />
          <Text variant="caption" color={color.danger}>
            {submitError}
          </Text>
        </View>
      )}

      <Button
        testID="submit-button"
        label="Alterar senha"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  submitError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: color.dangerMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
});
