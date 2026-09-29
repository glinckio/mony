import { TRIAL_DAYS, type Plan, type Subscription } from "@mony/shared-types";

import type { IconName } from "../components/ui/Icon";

import { formatDateDisplay, localTodayISO } from "./date-mask";
import { formatMoney, spokenMoney } from "./money-display";

const DAY_MS = 24 * 60 * 60 * 1000;

// Stripe's dates are instants (UTC): shown as the phone's local day, so a
// renewal at 01:30Z on the 6th reads as the 5th in Brazil.
export const subscriptionDate = (iso: string | null): string | null =>
  iso ? formatDateDisplay(localTodayISO(new Date(iso))) : null;
const dateOf = subscriptionDate;

export const PLAN_LABELS: Record<Plan["plan"], string> = {
  MONTHLY: "Mensal",
  ANNUAL: "Anual",
};

export interface SubscriptionCopy {
  // Short status (legacy names), read out with the hero.
  status: string;
  // The hero's chip: the status, or the offer when there's none.
  chip: string;
  icon: IconName;
  // The hero's headline: the plan, or the offer when nothing is live.
  headline: string;
  message: string;
  // Payment pending: the chip turns into an alert.
  alert: boolean;
}

const dayMonth = (date: Date) => formatDateDisplay(localTodayISO(date)).slice(0, 5);

// If the user starts the trial now: the first charge's day and the last
// full day to cancel without paying ("dd/mm").
export function trialChargeDate(now: Date = new Date()): { short: string; cancelBy: string } {
  const charge = now.getTime() + TRIAL_DAYS * DAY_MS;
  return { short: dayMonth(new Date(charge)), cancelBy: dayMonth(new Date(charge - DAY_MS)) };
}

// Legacy `planos.php` statuses and dates, arranged for the hero.
export function subscriptionCopy(
  subscription: Subscription | null,
  now: Date = new Date(),
): SubscriptionCopy {
  if (!subscription) {
    return {
      status: "Sem assinatura",
      chip: `${TRIAL_DAYS} dias grátis`,
      icon: "gift-outline",
      headline: "Experimente o Mony",
      message: `Nada é cobrado até ${trialChargeDate(now).short}.`,
      alert: false,
    };
  }
  const headline = `Plano ${PLAN_LABELS[subscription.plan]}`;
  const end = dateOf(subscription.currentPeriodEnd);
  if (subscription.status === "CANCELED") {
    return {
      status: "Cancelada",
      chip: "Cancelada",
      icon: "close-circle-outline",
      headline: "Sua assinatura terminou",
      message: "Escolha um plano para assinar de novo.",
      alert: false,
    };
  }
  // A failed payment outranks a scheduled cancellation: it's what the
  // user has to act on.
  if (subscription.status === "PAST_DUE") {
    return {
      status: "Pagamento pendente",
      chip: "Pagamento pendente",
      icon: "alert-circle-outline",
      headline,
      message: "Houve um problema com o pagamento. Atualize a forma de pagamento.",
      alert: true,
    };
  }
  if (subscription.cancelScheduled) {
    return {
      status: "Cancelamento agendado",
      chip: "Cancelamento agendado",
      icon: "calendar-outline",
      headline,
      message: end ? `Continua ativa até ${end}.` : "Será cancelada no fim do período.",
      alert: false,
    };
  }
  if (subscription.status === "TRIALING") {
    const trialEnd = dateOf(subscription.trialEndsAt);
    return {
      status: "Em teste",
      chip: "Em teste",
      icon: "hourglass-outline",
      headline,
      message: trialEnd ? `O teste grátis vai até ${trialEnd}.` : "Em teste grátis.",
      alert: false,
    };
  }
  return {
    status: "Ativa",
    chip: "Ativa",
    icon: "checkmark-circle-outline",
    headline,
    message: end ? `Renova em ${end}.` : "Assinatura ativa.",
    alert: false,
  };
}

// Where the user is in the free trial: "Dia 2 de 7 · faltam 6 dias".
// Day 1 is the day it started, so the bar is never empty.
export function trialProgress(
  subscription: Subscription | null,
  now: Date = new Date(),
): { percent: number; day: number; daysLeft: number } | null {
  if (subscription?.status !== "TRIALING" || !subscription.trialEndsAt) return null;
  const left = (new Date(subscription.trialEndsAt).getTime() - now.getTime()) / DAY_MS;
  const daysLeft = Math.max(0, Math.min(TRIAL_DAYS, Math.ceil(left)));
  const day = Math.min(TRIAL_DAYS, TRIAL_DAYS - daysLeft + 1);
  return { percent: (day / TRIAL_DAYS) * 100, day, daysLeft };
}

// "R$ 9,90/mês" · "R$ 65,34/ano"
export function priceCopy(plan: Plan): string {
  return `${formatMoney(plan.amount)}/${intervalLabel(plan)}`;
}

export const intervalLabel = (plan: Plan): string => (plan.interval === "month" ? "mês" : "ano");

export interface AnnualComparison {
  // "R$ 5,45/mês"
  monthlyEquivalent: string;
  // "Economize 45%"
  saving: string;
  // Read-aloud form, for screen readers.
  spokenSaving: string;
}

// The annual plan against twelve monthly payments, as legacy's comparison
// did (R$ 5,45/mês, 45% off).
export function annualComparison(plans: Plan[]): AnnualComparison | null {
  const monthly = plans.find((plan) => plan.interval === "month");
  const annual = plans.find((plan) => plan.interval === "year");
  if (!monthly || !annual) return null;
  const monthlyCents = Math.round(Number(monthly.amount) * 100);
  const annualCents = Math.round(Number(annual.amount) * 100);
  const savingCents = monthlyCents * 12 - annualCents;
  if (savingCents <= 0) return null;
  const percent = Math.round((savingCents / (monthlyCents * 12)) * 100);
  return {
    monthlyEquivalent: `${formatMoney(Math.round(annualCents / 12) / 100)}/mês`,
    saving: `Economize ${percent}%`,
    spokenSaving: `economize ${spokenMoney(savingCents / 100)} por ano, ${percent}%`,
  };
}

// Annual first: it's the preselected, better-value option.
export const orderPlans = (plans: Plan[]): Plan[] =>
  [...plans].sort((a, b) => (a.interval === b.interval ? 0 : a.interval === "year" ? -1 : 1));
