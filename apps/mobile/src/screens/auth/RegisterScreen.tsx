import { zodResolver } from "@hookform/resolvers/zod";
import { registerInputSchema, type AuthTokens, type RegisterInput } from "@mony/shared-types";
import { color, spacing, typography } from "@mony/ui-tokens";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Criar sua conta</Text>

          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Nome</Text>
                <TextInput
                  testID="name-input"
                  style={styles.input}
                  placeholderTextColor={color.textSecondary}
                  value={field.value}
                  onChangeText={field.onChange}
                  autoCapitalize="words"
                />
                {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  testID="email-input"
                  style={styles.input}
                  placeholderTextColor={color.textSecondary}
                  value={field.value}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Telefone (opcional)</Text>
                <TextInput
                  testID="phone-input"
                  style={styles.input}
                  placeholderTextColor={color.textSecondary}
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="phone-pad"
                />
                {errors.phone && <Text style={styles.error}>{errors.phone.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Senha</Text>
                <TextInput
                  testID="password-input"
                  style={styles.input}
                  placeholderTextColor={color.textSecondary}
                  value={field.value}
                  onChangeText={field.onChange}
                  secureTextEntry
                />
                {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="passwordConfirmation"
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Confirmar senha</Text>
                <TextInput
                  testID="password-confirmation-input"
                  style={styles.input}
                  placeholderTextColor={color.textSecondary}
                  value={field.value}
                  onChangeText={field.onChange}
                  secureTextEntry
                />
                {errors.passwordConfirmation && (
                  <Text style={styles.error}>{errors.passwordConfirmation.message}</Text>
                )}
              </View>
            )}
          />

          {submitError && <Text style={styles.submitError}>{submitError}</Text>}

          <TouchableOpacity
            testID="submit-button"
            style={styles.button}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={color.textPrimary} />
            ) : (
              <Text style={styles.buttonText}>Criar conta</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: color.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: color.textPrimary,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: color.textSecondary,
    fontSize: typography.size.sm,
  },
  input: {
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    color: color.textPrimary,
    fontSize: typography.size.md,
  },
  error: {
    color: color.danger,
    fontSize: typography.size.xs,
  },
  submitError: {
    color: color.danger,
    fontSize: typography.size.sm,
    textAlign: "center",
  },
  button: {
    backgroundColor: color.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonText: {
    color: color.textPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
  },
});
