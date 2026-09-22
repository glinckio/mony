import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileInputSchema,
  type Profile,
  type UpdateProfileInput,
} from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { AppHeader, Button, Screen, Text, TextField } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { formatPhone, unformatPhone } from "../../lib/phone";
import type { MainTabNavigation } from "../../navigation/RootNavigator";

export function ProfileScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileInputSchema),
    defaultValues: { name: "", email: "", phone: "", phone2: "" },
  });

  useEffect(() => {
    let cancelled = false;

    apiFetch<Profile>("/users/me")
      .then((profile) => {
        if (cancelled) return;
        reset({
          name: profile.name,
          email: profile.email,
          phone: profile.phone ?? "",
          phone2: profile.phone2 ?? "",
        });
      })
      .catch(() => {
        if (!cancelled) setSubmitError("Algo deu errado. Tente novamente.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = async (data: UpdateProfileInput) => {
    setSubmitError(null);
    setSaved(false);
    try {
      await apiFetch<Profile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          phone: data.phone || undefined,
          phone2: data.phone2 || undefined,
        }),
      });
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        setError("email", { type: "manual", message: "Este e-mail já está cadastrado." });
      } else {
        setSubmitError("Algo deu errado. Tente novamente.");
      }
    }
  };

  if (loading) {
    return (
      <Screen centered>
        <Text variant="caption">Carregando...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Meu perfil" />

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
              label="Telefone"
              value={formatPhone(field.value ?? "")}
              onChangeText={(text) => field.onChange(unformatPhone(text))}
              keyboardType="phone-pad"
              maxLength={15}
              placeholder="(11) 91234-5678"
              error={errors.phone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone2"
          render={({ field }) => (
            <TextField
              testID="phone2-input"
              label="Telefone secundário"
              value={formatPhone(field.value ?? "")}
              onChangeText={(text) => field.onChange(unformatPhone(text))}
              keyboardType="phone-pad"
              maxLength={15}
              placeholder="(11) 91234-5678"
              error={errors.phone2?.message}
            />
          )}
        />
      </View>

      {saved && (
        <View style={styles.confirmation}>
          <Ionicons name="checkmark-circle-outline" size={sizeTokens.iconSm} color={color.primary} />
          <Text variant="caption" style={styles.confirmationText}>
            Perfil atualizado com sucesso.
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

      <Button
        testID="submit-button"
        label="Salvar alterações"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
      />

      <TouchableOpacity
        testID="go-to-change-password"
        style={styles.changePasswordLink}
        onPress={() => navigation.navigate("ChangePassword")}
      >
        <Text variant="caption">
          <Text variant="bodyStrong">Alterar senha</Text>
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  changePasswordLink: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
});
