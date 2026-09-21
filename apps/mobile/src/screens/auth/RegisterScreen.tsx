import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerInputSchema, type AuthTokens, type RegisterInput } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { Button, Screen, Text, TextField } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";

export function RegisterScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: { name: "", email: "", password: "", passwordConfirmation: "", phone: "" },
  });

  const onSubmit = async (data: RegisterInput) => {
    setSubmitError(null);
    try {
      const tokens = await apiFetch<AuthTokens>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...data, phone: data.phone || undefined }),
      });
      setSession(tokens);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        setError("email", { type: "manual", message: "Este e-mail já está cadastrado." });
      } else {
        setSubmitError("Algo deu errado. Tente novamente.");
      }
    }
  };

  return (
    <Screen>
      <View style={styles.badge}>
        <Ionicons name="wallet-outline" size={28} color={color.primary} />
      </View>

      <Text variant="heading">Criar sua conta</Text>
      <Text variant="caption" style={styles.subtitle}>
        Comece a organizar suas finanças em poucos minutos.
      </Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              testID="name-input"
              label="Nome"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="words"
              error={errors.name?.message}
            />
          )}
        />

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
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <TextField
              testID="phone-input"
              label="Telefone (opcional)"
              value={field.value}
              onChangeText={field.onChange}
              keyboardType="phone-pad"
              error={errors.phone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              testID="password-input"
              label="Senha"
              value={field.value}
              onChangeText={field.onChange}
              secureToggle
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="passwordConfirmation"
          render={({ field }) => (
            <TextField
              testID="password-confirmation-input"
              label="Confirmar senha"
              value={field.value}
              onChangeText={field.onChange}
              secureToggle
              error={errors.passwordConfirmation?.message}
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
        label="Criar conta"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: color.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  submitError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: color.dangerMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
});
