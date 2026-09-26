import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileInputSchema,
  type Profile,
  type UpdateProfileInput,
} from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { Initials } from "../../components/domain";
import {
  Button,
  Card,
  InlineNotice,
  MenuRow,
  ScrollScreen,
  Skeleton,
  Text,
  TextField,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { formatPhone, unformatPhone } from "../../lib/phone";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

// Perfil (design/telas.md §19): the person's card on top, their details
// in a white card, and the password link below.
export function ProfileScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    watch,
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
      const updated = await apiFetch<Profile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          phone: data.phone || undefined,
          phone2: data.phone2 || undefined,
        }),
      });
      // Início and Mais greet the user from the session's copy.
      useAuthStore.setState((state) =>
        state.user ? { user: { ...state.user, name: updated.name, email: updated.email } } : state,
      );
      haptic.success();
      setSaved(true);
    } catch (error) {
      haptic.error();
      if (error instanceof ApiError && error.statusCode === 409) {
        setError("email", { type: "manual", message: "Este e-mail já está cadastrado." });
      } else {
        setSubmitError("Algo deu errado. Tente novamente.");
      }
    }
  };

  const name = watch("name");
  const email = watch("email");

  return (
    <ScrollScreen title="Meu perfil" onBack={() => navigation.goBack()} keyboardAware>
      <View style={styles.identity}>
        <Initials name={name} size={72} />
        {loading ? (
          <View style={styles.identitySkeleton}>
            <Skeleton width={160} height={20} />
            <Skeleton width={200} height={14} />
          </View>
        ) : (
          <View style={styles.identityText}>
            <Text variant="title2" align="center" numberOfLines={2}>
              {name || "Seu nome"}
            </Text>
            <Text variant="footnote" tone="muted" align="center" numberOfLines={1}>
              {email}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <Card style={styles.form}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={styles.skeletonField}>
              <Skeleton width={90} height={12} />
              <Skeleton height={48} radius="md" />
            </View>
          ))}
        </Card>
      ) : (
        <Card style={styles.form}>
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
                textContentType="name"
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
                textContentType="emailAddress"
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
                textContentType="telephoneNumber"
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
        </Card>
      )}

      <View style={styles.actions}>
        {saved ? <InlineNotice tone="success" message="Perfil atualizado com sucesso." /> : null}
        {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}
        <Button
          testID="submit-button"
          label="Salvar alterações"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={loading}
        />
      </View>

      <Card padded={false}>
        <MenuRow
          testID="go-to-change-password"
          icon="lock-closed-outline"
          label="Alterar senha"
          description="Troque a senha que você usa para entrar"
          onPress={() => navigation.navigate("ChangePassword")}
        />
      </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: "center",
    gap: space.md,
    marginBottom: space["2xl"],
  },
  identityText: {
    alignItems: "center",
    gap: 2,
  },
  identitySkeleton: {
    alignItems: "center",
    gap: space.sm,
  },
  form: {
    gap: space.lg,
    marginBottom: space.xl,
  },
  skeletonField: {
    gap: space.sm,
  },
  actions: {
    gap: space.md,
    marginBottom: space["2xl"],
  },
});
