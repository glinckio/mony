import { zodResolver } from "@hookform/resolvers/zod";
import { loginInputSchema, type AuthTokens, type LoginInput } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View, type TextInput } from "react-native";

import { AuthLayout, Button, InlineNotice, Text, TextField, Touchable } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import type { AuthStackNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

import { AuthLink } from "./AuthLink";

// Entrar (design/telas.md §4).
export function LoginScreen() {
  const navigation = useNavigation<AuthStackNavigation>();
  const setSession = useAuthStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

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
      haptic.success();
      // Only reachable signed in as the dev catalog's preview of this
      // screen: never swap out the session that is already open.
      if (useAuthStore.getState().accessToken) return;
      setSession(tokens);
    } catch (error) {
      haptic.error();
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
    <AuthLayout
      hero="large"
      title="Entrar"
      subtitle="Acesse sua conta para continuar organizando suas finanças."
      footer={
        <AuthLink
          testID="go-to-register"
          lead="Não tem uma conta?"
          action="Criar conta"
          onPress={() => navigation.navigate("Register")}
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
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              ref={passwordRef}
              testID="password-input"
              label="Senha"
              leftIcon="lock-closed-outline"
              value={field.value}
              onChangeText={field.onChange}
              secureToggle
              textContentType="password"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit(onSubmit)}
              error={errors.password?.message}
            />
          )}
        />
        <Touchable
          testID="go-to-forgot-password"
          feedback="fade"
          accessibilityRole="link"
          onPress={() => navigation.navigate("ForgotPassword")}
          style={styles.forgot}
          hitSlop={10}
        >
          <Text variant="subhead" tone="primary">
            Esqueceu sua senha?
          </Text>
        </Touchable>
      </View>

      {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}

      <Button
        testID="submit-button"
        label="Entrar"
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
  forgot: {
    alignSelf: "flex-end",
  },
});
