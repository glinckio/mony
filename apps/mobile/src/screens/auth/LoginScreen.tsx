import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginInputSchema, type AuthTokens, type LoginInput } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Button, Screen, Text, TextField } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import type { AuthStackNavigation } from "../../navigation/RootNavigator";

export function LoginScreen() {
  const navigation = useNavigation<AuthStackNavigation>();
  const setSession = useAuthStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitError(null);
    try {
      const tokens = await apiFetch<AuthTokens>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setSession(tokens);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setSubmitError("Sua conta está inativa. Entre em contato com o suporte.");
      } else if (error instanceof ApiError && error.statusCode === 429) {
        setSubmitError("Muitas tentativas. Tente novamente em alguns minutos.");
      } else {
        setSubmitError("E-mail ou senha incorretos.");
      }
    }
  };

  return (
    <Screen>
      <Text variant="heading">Entrar</Text>
      <Text variant="caption" style={styles.subtitle}>
        Acesse sua conta para continuar organizando suas finanças.
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
              error={errors.email?.message}
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
        label="Entrar"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
      />

      <TouchableOpacity
        testID="go-to-register"
        style={styles.registerLink}
        onPress={() => navigation.navigate("Register")}
      >
        <Text variant="caption">
          Não tem uma conta? <Text variant="bodyStrong">Criar conta</Text>
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
  submitError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: color.dangerMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  registerLink: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
});
