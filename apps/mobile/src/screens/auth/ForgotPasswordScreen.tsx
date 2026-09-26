import { zodResolver } from "@hookform/resolvers/zod";
import { requestResetInputSchema, type RequestResetInput } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { AuthLayout, Button, InlineNotice, TextField } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import type { AuthStackNavigation } from "../../navigation/RootNavigator";
import { haptic } from "../../theme/haptics";

import { AuthLink } from "./AuthLink";

// Esqueci a senha (design/telas.md §21). The answer is always the same
// generic message — it never reveals whether the e-mail exists.
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
      haptic.success();
      setSent(true);
    } catch {
      haptic.error();
      setSubmitError("Algo deu errado. Tente novamente.");
    }
  };

  return (
    <AuthLayout
      title="Esqueceu sua senha?"
      subtitle="Informe seu e-mail e enviaremos um código para redefinir sua senha."
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
            editable={!sent}
            error={errors.email?.message}
          />
        )}
      />

      {sent ? (
        <InlineNotice
          tone="success"
          message="Se este e-mail estiver cadastrado, você receberá um código em instantes."
        />
      ) : null}
      {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}

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
    </AuthLayout>
  );
}
