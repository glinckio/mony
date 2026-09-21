import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestResetInputSchema, type RequestResetInput } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Button, Screen, Text, TextField } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import type { AuthStackNavigation } from "../../navigation/RootNavigator";

export function ForgotPasswordScreen() {
  const navigation = useNavigation<AuthStackNavigation>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RequestResetInput>({
    resolver: zodResolver(requestResetInputSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: RequestResetInput) => {
    setSubmitError(null);
    try {
      await apiFetch<{ message: string }>("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setSent(true);
    } catch {
      setSubmitError("Algo deu errado. Tente novamente.");
    }
  };

  return (
    <Screen>
      <Text variant="heading">Esqueceu sua senha?</Text>
      <Text variant="caption" style={styles.subtitle}>
        Informe seu e-mail e enviaremos um código para redefinir sua senha.
      </Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              testID="email-input"
              label="E-mail"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!sent}
              error={errors.email?.message}
            />
          )}
        />
      </View>

      {sent && (
        <View style={styles.confirmation}>
          <Ionicons name="checkmark-circle-outline" size={sizeTokens.iconSm} color={color.primary} />
          <Text variant="caption" style={styles.confirmationText}>
            Se este e-mail estiver cadastrado, você receberá um código em instantes.
          </Text>
        </View>
      )}

      {submitError && (
        <View style={styles.submitError}>
          <Ionicons name="alert-circle-outline" size={sizeTokens.iconSm} color={color.danger} />
          <Text variant="caption" color={color.danger}>
            {submitError}
          </Text>
        </View>
      )}

      {sent ? (
        <Button
          testID="go-to-reset"
          label="Já tenho um código"
          onPress={() => navigation.navigate("ResetPassword", { email: getValues("email") })}
        />
      ) : (
        <Button
          testID="submit-button"
          label="Enviar código"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        />
      )}

      <TouchableOpacity
        testID="go-to-login"
        style={styles.loginLink}
        onPress={() => navigation.navigate("Login")}
      >
        <Text variant="caption">
          Lembrou a senha? <Text variant="bodyStrong">Entrar</Text>
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginBottom: spacing.sm,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  confirmation: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: color.primaryMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  confirmationText: {
    flex: 1,
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
  loginLink: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
});
