import { zodResolver } from "@hookform/resolvers/zod";
import { confirmResetInputSchema, type ConfirmResetInput } from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { AuthLayout, Button, IconBadge, InlineNotice, TextField } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import type { AuthStackNavigation, AuthStackParamList } from "../../navigation/RootNavigator";
import { space, useTheme } from "../../theme";
import { haptic } from "../../theme/haptics";

import { AuthLink } from "./AuthLink";

// Redefinir senha (design/telas.md §22): code + new password; success
// turns the card into a confirmation with the way back to Entrar.
export function ResetPasswordScreen() {
  const navigation = useNavigation<AuthStackNavigation>();
  const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();
  const { colors } = useTheme();
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
      haptic.success();
      setDone(true);
    } catch (error) {
      haptic.error();
      if (error instanceof ApiError && error.statusCode === 429) {
        setSubmitError("Muitas tentativas. Tente novamente em alguns minutos.");
      } else {
        setSubmitError("Código inválido ou expirado.");
      }
    }
  };

  if (done) {
    return (
      <AuthLayout
        title="Senha redefinida"
        subtitle="Sua senha foi atualizada. Entre com sua nova senha para continuar."
      >
        <View style={styles.done}>
          <IconBadge icon="checkmark-circle" color={colors.success} size={72} filled />
        </View>
        <Button
          testID="go-to-login"
          label="Ir para o login"
          onPress={() => navigation.navigate("Login")}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Redefinir senha"
      subtitle="Informe o código enviado por e-mail e escolha uma nova senha."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={
        <AuthLink
          testID="go-to-login"
          lead="Lembrou a senha?"
          action="Entrar"
          onPress={() => navigation.navigate("Login")}
        />
      }
    >
      <View style={styles.fields}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              testID="email-input"
              label="E-mail"
              leftIcon="mail-outline"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
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
              leftIcon="keypad-outline"
              value={field.value}
              onChangeText={field.onChange}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              style={styles.code}
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
              leftIcon="lock-closed-outline"
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
              leftIcon="lock-closed-outline"
              value={field.value}
              onChangeText={field.onChange}
              secureToggle
              textContentType="newPassword"
              error={errors.newPasswordConfirmation?.message}
            />
          )}
        />
      </View>

      {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}

      <Button
        testID="submit-button"
        label="Redefinir senha"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: space.lg,
  },
  code: {
    letterSpacing: 6,
  },
  done: {
    alignItems: "center",
  },
});
