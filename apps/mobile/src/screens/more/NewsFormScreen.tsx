import { zodResolver } from "@hookform/resolvers/zod";
import {
  CHANGELOG_DESCRIPTION_MAX,
  CHANGELOG_TITLE_MAX,
  changelogInputSchema,
  type ChangelogInput,
  type ChangelogStatus,
} from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  Button,
  ConfirmSheet,
  Field,
  FormScreen,
  InlineNotice,
  SegmentedControl,
  TextField,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { ADMIN_NEWS_KEY, NEWS_KEY } from "../../lib/changelog-display";
import { formatDateDisplay, formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import { useToastStore } from "../../lib/toast-store";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";
import { haptic } from "../../theme/haptics";

const STATUS_OPTIONS: Array<{ value: ChangelogStatus; label: string }> = [
  { value: "ACTIVE", label: "Ativa" },
  { value: "INACTIVE", label: "Inativa" },
];

// pt-BR copy per known status; never the API's own message.
const errorCopy = (error: unknown) =>
  error instanceof ApiError && error.statusCode === 403
    ? "Só administradores podem mexer nas novidades."
    : error instanceof ApiError && error.statusCode === 404
      ? "Essa novidade não existe mais."
      : "Algo deu errado. Tente novamente.";

// Nova / Editar novidade (design/telas.md §32; legacy's admin modals):
// title, text (plain), YouTube link and last day shown; on edit, the
// status and "Excluir". Published on save (legacy).
export function NewsFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const editing = useRoute<RouteProp<AppStackParamList, "NewsForm">>().params?.entry;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dateText, setDateText] = useState(
    editing?.expiresAt ? formatDateDisplay(editing.expiresAt) : "",
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ChangelogInput>({
    resolver: zodResolver(changelogInputSchema),
    defaultValues: {
      title: editing?.title ?? "",
      description: editing?.description ?? "",
      // The short form fits the field.
      videoUrl: editing?.videoId ? `https://youtu.be/${editing.videoId}` : "",
      expiresAt: editing?.expiresAt ?? "",
      status: editing?.status ?? "ACTIVE",
    },
  });

  const done = async (message: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_NEWS_KEY }),
      queryClient.invalidateQueries({ queryKey: NEWS_KEY }),
    ]);
    haptic.success();
    useToastStore.getState().show(message, { tone: "success" });
    navigation.goBack();
  };

  const onSubmit = async (data: ChangelogInput) => {
    setSubmitError(null);
    try {
      if (editing) {
        await apiFetch(`/admin/changelog/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            videoUrl: data.videoUrl || null,
            expiresAt: data.expiresAt || null,
            status: data.status,
          }),
        });
        await done("Novidade atualizada.");
      } else {
        await apiFetch("/admin/changelog", {
          method: "POST",
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            ...(data.videoUrl ? { videoUrl: data.videoUrl } : {}),
            ...(data.expiresAt ? { expiresAt: data.expiresAt } : {}),
          }),
        });
        await done("Novidade publicada.");
      }
    } catch (error) {
      haptic.error();
      setSubmitError(errorCopy(error));
    }
  };

  const onDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/changelog/${editing.id}`, { method: "DELETE" });
      setConfirmingDelete(false);
      await done("Novidade excluída.");
    } catch (error) {
      haptic.error();
      setSubmitError(errorCopy(error));
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <FormScreen
      title={editing ? "Editar novidade" : "Nova novidade"}
      onClose={() => navigation.goBack()}
      footer={
        <>
          {submitError ? (
            <InlineNotice testID="news-form-error" tone="danger" message={submitError} />
          ) : null}
          <Button
            testID="submit-button"
            label={editing ? "Salvar alterações" : "Publicar"}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </>
      }
    >
      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField
            testID="title-input"
            label="Título"
            placeholder="Ex.: Relatórios chegaram"
            value={field.value}
            onChangeText={field.onChange}
            maxLength={CHANGELOG_TITLE_MAX}
            error={errors.title?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            testID="description-input"
            label="Texto"
            hint="Texto simples; as quebras de linha aparecem para os usuários."
            value={field.value}
            onChangeText={field.onChange}
            multiline
            maxLength={CHANGELOG_DESCRIPTION_MAX}
            error={errors.description?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="videoUrl"
        render={({ field }) => (
          <TextField
            testID="video-input"
            label="Vídeo do YouTube (opcional)"
            leftIcon="logo-youtube"
            placeholder="https://youtu.be/…"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            value={field.value}
            onChangeText={field.onChange}
            error={errors.videoUrl?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="expiresAt"
        render={() => (
          <TextField
            testID="expires-input"
            label="Mostrar até (opcional)"
            hint="Último dia em que aparece para os usuários."
            leftIcon="calendar-outline"
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
            value={dateText}
            onChangeText={(text) => {
              const display = formatDateInputDigits(text);
              setDateText(display);
              // Incomplete → "Data inválida." from the schema; empty → none.
              setValue("expiresAt", display ? parseDateInputToISO(display) || display : "", {
                shouldValidate: display.length === 10 || display.length === 0,
              });
            }}
            error={errors.expiresAt?.message}
          />
        )}
      />

      {editing ? (
        <>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Field label="Situação">
                <SegmentedControl
                  testID="status-toggle"
                  accessibilityLabel="Situação"
                  options={STATUS_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              </Field>
            )}
          />
          <Button
            testID="delete-news-button"
            label="Excluir novidade"
            variant="dangerGhost"
            leftIcon="trash-outline"
            onPress={() => setConfirmingDelete(true)}
          />
        </>
      ) : null}

      <ConfirmSheet
        testID="delete-news-sheet"
        visible={confirmingDelete}
        title={editing ? `Excluir "${editing.title}"?` : ""}
        message="Ela some para todos os usuários, e o registro de quem leu vai junto."
        confirmLabel="Excluir"
        busy={deleting}
        onConfirm={() => void onDelete()}
        onClose={() => setConfirmingDelete(false)}
      />
    </FormScreen>
  );
}
