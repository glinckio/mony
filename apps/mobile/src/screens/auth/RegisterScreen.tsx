import { zodResolver } from "@hookform/resolvers/zod";
import { registerInputSchema, type AuthTokens, type RegisterInput } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { AuthLayout, Button, InlineNotice, TextField } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import type { AuthStackNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

import { AuthLink } from "./AuthLink";

// Criar conta (design/telas.md §5).
export function RegisterScreen() {
  const navigation = useNavigation<AuthStackNavigation>();
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
      haptic.success();
      // Only reachable signed in as the dev catalog's preview of this
      // screen: never swap out the session that is already open.
      if (useAuthStore.getState().accessToken) return;
      setSession(tokens);
    } catch (error) {
      haptic.error();
      if (error instanceof ApiError && error.statusCode === 409) {
        setError("email", { type: "manual", message: "Este e-mail já está cadastrado." });
      } else {
        setSubmitError("Algo deu errado. Tente novamente.");
      }
    }
  };

  return (
    <AuthLayout
      title="Criar sua conta"
      subtitle="Comece a organizar suas finanças em poucos minutos."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={
        <AuthLink
          testID="go-to-login"
          lead="Já tem uma conta?"
          action="Entrar"
          onPress={() => navigation.navigate("Login")}
        />
      }
    >
      <View style={styles.fields}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              testID="name-input"
              label="Nome"
              leftIcon="person-outline"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
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
              leftIcon="mail-outline"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
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
              leftIcon="call-outline"
              value={field.value}
              onChangeText={field.onChange}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
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
              leftIcon="lock-closed-outline"
              value={field.value}
              onChangeText={field.onChange}
              secureToggle
              textContentType="newPassword"
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
              leftIcon="lock-closed-outline"
              value={field.value}
              onChangeText={field.onChange}
              secureToggle
              textContentType="newPassword"
              error={errors.passwordConfirmation?.message}
            />
          )}
        />
      </View>

      {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}

      <Button
        testID="submit-button"
        label="Criar conta"
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
});
