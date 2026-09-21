import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { confirmResetInputSchema, type ConfirmResetInput } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Button, Screen, Text, TextField } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import type { AuthStackNavigation, AuthStackParamList } from "../../navigation/RootNavigator";

export function ResetPasswordScreen() {
  const navigation = useNavigation<AuthStackNavigation>();
  const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmResetInput>({
    resolver: zodResolver(confirmResetInputSchema),
    defaultValues: {
      email: route.params?.email ?? "",
      code: "",
      newPassword: "",
      newPasswordConfirmation: "",
    },
  });

  const onSubmit = async (data: ConfirmResetInput) => {
    setSubmitError(null);
    try {
      await apiFetch<{ message: string }>("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 429) {
        setSubmitError("Muitas tentativas. Tente novamente em alguns minutos.");
      } else {
        setSubmitError("Código inválido ou expirado.");
      }
    }
  };

  if (done) {
    return (
      <Screen>
        <Text variant="heading">Senha redefinida</Text>
        <Text variant="caption" style={styles.subtitle}>
          Sua senha foi atualizada. Entre com sua nova senha para continuar.
        </Text>
        <Button
          testID="go-to-login"
          label="Ir para o login"
          onPress={() => navigation.navigate("Login")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="heading">Redefinir senha</Text>
      <Text variant="caption" style={styles.subtitle}>
        Informe o código enviado por e-mail e escolha uma nova senha.
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
          name="code"
          render={({ field }) => (
            <TextField
              testID="code-input"
              label="Código"
              value={field.value}
              onChangeText={field.onChange}
              keyboardType="number-pad"
              maxLength={6}
              error={errors.code?.message}
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
        label="Redefinir senha"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
      />

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
