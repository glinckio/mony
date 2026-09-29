import {
  isLiveSubscription,
  type MySubscription,
  type Plan,
  type PlanType,
  type RedirectUrl,
  type Subscription,
} from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PlanCard, SubscriptionHero, TrialTimeline } from "../../components/domain";
import {
  Button,
  Card,
  ConfirmSheet,
  ErrorState,
  InlineNotice,
  MenuRow,
  ScrollScreen,
  Skeleton,
  Text,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { openHostedPage } from "../../lib/subscription-checkout";
import {
  annualComparison,
  intervalLabel,
  orderPlans,
  priceCopy,
  subscriptionCopy,
  subscriptionDate,
  trialChargeDate,
  trialProgress,
} from "../../lib/subscription-display";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

// After Stripe returns, the webhook can take a few seconds to update the
// subscription: poll /me every 2 s for up to 20 s.
const POLL_INTERVAL_MS = 2000;
const POLL_WINDOW_MS = 20_000;

const ME_KEY = ["subscription"] as const;

// What the plan includes — legacy's comparison table, condensed (both
// plans are the same; nothing in the app is gated on it).
const FEATURES = [
  "Lançamentos e categorias sem limite",
  "Metas, dívidas e relatórios",
  "Resumo do mês na tela inicial",
] as const;

// pt-BR copy per known status; never the API's own message.
function errorCopy(error: unknown): string {
  if (error instanceof ApiError && error.statusCode === 409) return "Você já tem uma assinatura.";
  if (error instanceof ApiError && error.statusCode === 503) {
    return "Pagamentos indisponíveis no momento. Tente mais tarde.";
  }
  return "Algo deu errado. Tente novamente.";
}

const isConflict = (error: unknown) => error instanceof ApiError && error.statusCode === 409;

// Assinatura (design/telas.md → Assinatura): the current status on top
// (legacy copy and dates), the two plans when there's nothing live, and
// cancel / reactivate / "manage payment" (Stripe's portal) otherwise.
// Payment happens on Stripe's hosted page, in the in-app browser.
export function SubscriptionScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PlanType>("ANNUAL");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  // The poll window ran out before the webhook landed.
  const [confirmationLate, setConfirmationLate] = useState(false);

  const plans = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => apiFetch<Plan[]>("/subscriptions/plans"),
    staleTime: 60 * 60 * 1000,
  });
  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: () => apiFetch<MySubscription>("/subscriptions/me"),
    refetchInterval: waitingSince ? POLL_INTERVAL_MS : false,
  });
  const subscription = me.data?.subscription ?? null;
  const live = subscription ? isLiveSubscription(subscription.status) : false;

  // Polling stops on a timer (a failed poll doesn't update the data, so a
  // data-driven check could keep it going forever) or as soon as the
  // webhook has landed.
  useEffect(() => {
    if (!waitingSince) return;
    const timer = setTimeout(() => {
      setWaitingSince(null);
      setConfirmationLate(true);
    }, POLL_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [waitingSince]);
  useEffect(() => {
    if (!live) return;
    setWaitingSince(null);
    setConfirmationLate(false);
  }, [live]);

  const setSubscription = (updated: Subscription) =>
    queryClient.setQueryData<MySubscription>(ME_KEY, { subscription: updated });

  const checkout = useMutation({
    mutationFn: async (plan: PlanType) => {
      const { url } = await apiFetch<RedirectUrl>("/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      return openHostedPage(url);
    },
    onSuccess: (result) => {
      if (result === "success") {
        haptic.success();
        setConfirmationLate(false);
        setWaitingSince(Date.now());
      }
      void me.refetch();
    },
    onError: (failure) => {
      setError(errorCopy(failure));
      // Already subscribed on Stripe (the API has just synced it): show it.
      if (isConflict(failure)) void me.refetch();
    },
  });

  const portal = useMutation({
    mutationFn: async () => {
      const { url } = await apiFetch<RedirectUrl>("/subscriptions/portal", { method: "POST" });
      return openHostedPage(url);
    },
    // The card may have been updated there: re-read the status.
    onSettled: () => void me.refetch(),
    onError: (failure) => setError(errorCopy(failure)),
  });

  // A failure may mean the local status was stale (the API re-syncs it
  // from Stripe then): re-read it either way.
  const cancel = useMutation({
    mutationFn: () => apiFetch<Subscription>("/subscriptions/cancel", { method: "POST" }),
    onSuccess: (updated) => {
      setSubscription(updated);
      setConfirmingCancel(false);
    },
    onError: () => void me.refetch(),
  });

  const reactivate = useMutation({
    mutationFn: () => apiFetch<Subscription>("/subscriptions/reactivate", { method: "POST" }),
    onSuccess: (updated) => {
      haptic.success();
      setSubscription(updated);
    },
    onError: (failure) => {
      setError(errorCopy(failure));
      void me.refetch();
    },
  });

  const busy = checkout.isPending || portal.isPending || cancel.isPending || reactivate.isPending;
  const copy = subscriptionCopy(subscription);
  const comparison = plans.data ? annualComparison(plans.data) : null;
  const endDate = subscriptionDate(subscription?.currentPeriodEnd ?? null);
  const livePlan = subscription && plans.data?.find((plan) => plan.plan === subscription.plan);
  const selectedPlan = plans.data?.find((plan) => plan.plan === selected);
  // Legacy's trial goes to someone who never subscribed (the API has the
  // final word, checking Stripe too).
  const trialEligible = me.data !== undefined && subscription === null;
  const trialDates = trialChargeDate();
  const pastDue = subscription?.status === "PAST_DUE";

  const openPortal = () => {
    if (busy) return;
    setError(null);
    portal.mutate();
  };

  const manageRows =
    subscription && live
      ? [
          pastDue ? null : (
            <MenuRow
              key="manage"
              testID="manage-payment"
              icon="card-outline"
              label="Gerenciar pagamento"
              description="Cartão e faturas, na página do Stripe"
              onPress={openPortal}
            />
          ),
          subscription.cancelScheduled ? null : (
            <MenuRow
              key="cancel"
              testID="cancel-subscription"
              icon="close-circle-outline"
              tone="danger"
              label="Cancelar assinatura"
              description={
                endDate ? `Você continua com ela até ${endDate}` : "Continua até o fim do período"
              }
              divider={!pastDue}
              onPress={() => {
                if (busy) return;
                setError(null);
                setConfirmingCancel(true);
              }}
            />
          ),
        ].filter(Boolean)
      : [];

  return (
    <ScrollScreen
      title="Assinatura"
      onBack={() => navigation.goBack()}
      footer={
        me.data && !live ? (
          <View style={styles.section}>
            {error ? (
              <InlineNotice testID="subscription-error" tone="danger" message={error} />
            ) : null}
            <Button
              testID="start-checkout"
              label={trialEligible ? "Começar 7 dias grátis" : "Assinar"}
              loading={checkout.isPending}
              // No second checkout while the first one is being confirmed.
              disabled={busy || !plans.data || waitingSince !== null}
              onPress={() => {
                setError(null);
                checkout.mutate(selected);
              }}
            />
          </View>
        ) : undefined
      }
    >
      <View style={styles.stack}>
        <View style={styles.section}>
          {/* Only without data: one failed poll keeps the hero on screen. */}
          {me.isError && !me.data ? (
            <ErrorState onRetry={() => void me.refetch()} />
          ) : !me.data ? (
            <Skeleton height={240} radius="xl" />
          ) : (
            <SubscriptionHero
              testID="subscription-status"
              copy={copy}
              price={live && livePlan ? priceCopy(livePlan) : null}
              trial={trialProgress(subscription)}
              features={live ? undefined : FEATURES}
            />
          )}
          {waitingSince ? (
            <InlineNotice
              testID="subscription-confirming"
              tone="neutral"
              message="Confirmando seu pagamento…"
            />
          ) : confirmationLate && !live ? (
            <InlineNotice
              testID="subscription-confirmation-late"
              tone="neutral"
              message="A confirmação do pagamento está demorando. Se você concluiu a assinatura, ela aparece aqui em alguns minutos."
            />
          ) : null}
        </View>

        {subscription && live ? (
          <View style={styles.section}>
            {pastDue ? (
              <Button
                testID="manage-payment"
                label="Atualizar forma de pagamento"
                leftIcon="card-outline"
                loading={portal.isPending}
                disabled={busy}
                onPress={openPortal}
              />
            ) : null}
            {subscription.cancelScheduled ? (
              <Button
                testID="reactivate-subscription"
                label="Reativar assinatura"
                // One primary action: with a payment pending, that's the card.
                variant={pastDue ? "secondary" : "primary"}
                loading={reactivate.isPending}
                disabled={busy}
                onPress={() => {
                  setError(null);
                  reactivate.mutate();
                }}
              />
            ) : null}
            {error ? (
              <InlineNotice testID="subscription-error" tone="danger" message={error} />
            ) : null}
            {manageRows.length > 0 ? <Card padded={false}>{manageRows}</Card> : null}
          </View>
        ) : null}

        {me.data && !live ? (
          <>
            <View style={styles.section}>
              <Text variant="title3" accessibilityRole="header">
                Escolha o plano
              </Text>
              {plans.isError ? (
                <InlineNotice tone="danger" message="Não foi possível carregar os planos." />
              ) : !plans.data ? (
                <Skeleton height={220} radius="lg" />
              ) : (
                <View style={styles.plans} accessibilityRole="radiogroup">
                  {orderPlans(plans.data).map((plan) => (
                    <PlanCard
                      key={plan.plan}
                      testID={`plan-${plan.plan}`}
                      plan={plan}
                      selected={plan.plan === selected}
                      comparison={plan.interval === "year" ? comparison : null}
                      onPress={() => setSelected(plan.plan)}
                    />
                  ))}
                </View>
              )}
            </View>

            {trialEligible && selectedPlan ? (
              <View style={styles.section}>
                <Text variant="title3" accessibilityRole="header">
                  Como funciona o teste
                </Text>
                <TrialTimeline
                  testID="trial-timeline"
                  cancelBy={trialDates.cancelBy}
                  chargeOn={trialDates.short}
                  amount={selectedPlan.amount}
                  interval={intervalLabel(selectedPlan)}
                />
              </View>
            ) : null}

            <Text variant="footnote" tone="muted" align="center">
              O pagamento é feito no Stripe, que recebe seu e-mail.
            </Text>
          </>
        ) : null}
      </View>

      <ConfirmSheet
        testID="cancel-subscription-sheet"
        visible={confirmingCancel}
        title="Cancelar a assinatura?"
        message={
          endDate
            ? `Você continua com a assinatura até ${endDate} e pode reativar antes disso.`
            : "Ela continua até o fim do período e dá para reativar antes disso."
        }
        confirmLabel="Cancelar assinatura"
        cancelLabel="Manter"
        busy={cancel.isPending}
        // Shown inside the sheet: anything behind the modal is hidden.
        error={cancel.isError ? errorCopy(cancel.error) : null}
        onConfirm={() => cancel.mutate()}
        onClose={() => {
          setConfirmingCancel(false);
          cancel.reset();
        }}
      />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  // Sections sit clearly further apart than the pieces inside them.
  stack: {
    gap: space["3xl"],
  },
  section: {
    gap: space.md,
  },
  plans: {
    gap: space.md,
  },
});
