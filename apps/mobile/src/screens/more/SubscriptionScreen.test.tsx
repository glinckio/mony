import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ApiError, apiFetch } from "../../lib/api-client";
import { openHostedPage } from "../../lib/subscription-checkout";

import { SubscriptionScreen } from "./SubscriptionScreen";

jest.mock("../../lib/api-client", () => {
  class MockApiError extends Error {
    statusCode: number;
    constructor(statusCode: number) {
      super("api error");
      this.statusCode = statusCode;
    }
  }
  return { apiFetch: jest.fn(), ApiError: MockApiError };
});
jest.mock("../../lib/subscription-checkout", () => ({ openHostedPage: jest.fn() }));

const mockedApiFetch = apiFetch as jest.Mock;
const mockedOpen = openHostedPage as jest.Mock;
const Stack = createNativeStackNavigator();

const PLANS = [
  { plan: "MONTHLY", amount: "9.90", currency: "BRL", interval: "month", trialDays: 7 },
  { plan: "ANNUAL", amount: "65.34", currency: "BRL", interval: "year", trialDays: 7 },
];
const ACTIVE = {
  plan: "MONTHLY",
  status: "ACTIVE",
  currentPeriodEnd: "2026-10-28T12:00:00.000Z",
  trialEndsAt: null,
  cancelScheduled: false,
  updatedAt: "2026-09-28T12:00:00.000Z",
};
const newApiError = (status: number) =>
  new (ApiError as unknown as new (s: number) => Error)(status);

function mockApi(
  state: { subscription: typeof ACTIVE | null },
  extra: Record<string, unknown> = {},
) {
  mockedApiFetch.mockImplementation(async (path: string) => {
    if (path in extra) {
      const value = extra[path];
      if (value instanceof Error) throw value;
      if (typeof value === "function") return (value as () => unknown)();
      return value;
    }
    if (path === "/subscriptions/plans") return PLANS;
    if (path === "/subscriptions/me") return { subscription: state.subscription };
    throw new Error(`unexpected ${path}`);
  });
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

const callsTo = (path: string) =>
  mockedApiFetch.mock.calls.filter(([called]) => called === path).length;
const checkoutButtonDisabled = () =>
  screen.getByTestId("start-checkout").props.accessibilityState.disabled as boolean;

describe("SubscriptionScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedOpen.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("offers the plans with the trial when there's no subscription", async () => {
    mockApi({ subscription: null });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Experimente o Mony")).toBeTruthy();
    });
    // The hero reads out the status too.
    expect(screen.getByTestId("subscription-status").props.accessibilityLabel).toMatch(
      /^Sem assinatura\. Experimente o Mony\./,
    );
    expect(screen.getByTestId("plan-MONTHLY")).toBeTruthy();
    expect(screen.getByText("Economize 45%")).toBeTruthy();
    // Annual first and preselected (best value).
    expect(screen.getByTestId("plan-ANNUAL").props.accessibilityState.selected).toBe(true);
    // How the trial plays out, with the selected plan's price.
    expect(screen.getByText(/Cobrança de R\$\s65,34, e depois todo ano\./)).toBeTruthy();
    await fireEvent.press(screen.getByTestId("plan-MONTHLY"));
    expect(screen.getByText(/Cobrança de R\$\s9,90, e depois todo mês\./)).toBeTruthy();
    expect(screen.getByText("Começar 7 dias grátis")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("reads the annual plan aloud as the best value, with the saving", async () => {
    mockApi({ subscription: null });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("plan-ANNUAL")).toBeTruthy();
    });
    // What a screen reader announces for each radio: the price is spoken,
    // not read as "R$ 65,34/ano".
    const annual = screen.getByRole("radio", {
      name: "Plano Anual, 65 reais e 34 centavos por ano. Melhor valor, economize 53 reais e 46 centavos por ano, 45%",
    });
    expect(annual.props.accessibilityState.selected).toBe(true);
    const monthly = screen.getByRole("radio", {
      name: "Plano Mensal, 9 reais e 90 centavos por mês",
    });
    expect(monthly.props.accessibilityState.selected).toBe(false);
    view.unmount();
    await flush();
  });

  it("opens Stripe's checkout for the chosen plan and waits for the webhook", async () => {
    const state = { subscription: null as typeof ACTIVE | null };
    mockApi(state, { "/subscriptions/checkout": { url: "https://checkout.stripe.test/c" } });
    mockedOpen.mockImplementation(async () => {
      // The webhook lands while the user is on Stripe's page.
      state.subscription = { ...ACTIVE, status: "TRIALING" };
      return "success";
    });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("plan-MONTHLY")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("plan-MONTHLY"));
    await fireEvent.press(screen.getByTestId("start-checkout"));

    await waitFor(() => {
      expect(mockedOpen).toHaveBeenCalledWith("https://checkout.stripe.test/c");
    });
    expect(mockedApiFetch).toHaveBeenCalledWith("/subscriptions/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "MONTHLY" }),
    });
    await waitFor(() => {
      expect(screen.getByText("Em teste")).toBeTruthy();
    });
    expect(screen.queryByTestId("start-checkout")).toBeNull();
    view.unmount();
    await flush();
  });

  it("maps 409 and 503 to pt-BR copy, never the API message", async () => {
    mockApi({ subscription: null }, { "/subscriptions/checkout": newApiError(503) });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("start-checkout")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("start-checkout"));
    await waitFor(() => {
      expect(
        screen.getByText("Pagamentos indisponíveis no momento. Tente mais tarde."),
      ).toBeTruthy();
    });
    expect(mockedOpen).not.toHaveBeenCalled();
    view.unmount();
    await flush();
  });

  it("shows the subscription Stripe already has after a 409 on checkout", async () => {
    const state = { subscription: null as typeof ACTIVE | null };
    mockApi(state, {
      "/subscriptions/checkout": () => {
        // Subscribed on another device: the API syncs it from Stripe, then 409s.
        state.subscription = ACTIVE;
        throw newApiError(409);
      },
    });
    const view = await renderScreen();

    await waitFor(() => {
      expect(checkoutButtonDisabled()).toBe(false);
    });
    const reads = callsTo("/subscriptions/me");
    await fireEvent.press(screen.getByTestId("start-checkout"));

    await waitFor(() => {
      expect(screen.getByText("Você já tem uma assinatura.")).toBeTruthy();
    });
    // /me is read again, so the plans give way to the live subscription.
    await waitFor(() => {
      expect(screen.getByText("Ativa")).toBeTruthy();
    });
    expect(callsTo("/subscriptions/me")).toBeGreaterThan(reads);
    expect(screen.queryByTestId("start-checkout")).toBeNull();
    expect(mockedOpen).not.toHaveBeenCalled();
    view.unmount();
    await flush();
  });

  it("disables the checkout button while the payment is being confirmed", async () => {
    // The webhook hasn't landed: /me still answers no subscription.
    mockApi(
      { subscription: null },
      { "/subscriptions/checkout": { url: "https://checkout.stripe.test/c" } },
    );
    mockedOpen.mockResolvedValue("success");
    const view = await renderScreen();

    await waitFor(() => {
      expect(checkoutButtonDisabled()).toBe(false);
    });
    await fireEvent.press(screen.getByTestId("start-checkout"));

    await waitFor(() => {
      expect(screen.getByText("Confirmando seu pagamento…")).toBeTruthy();
    });
    expect(checkoutButtonDisabled()).toBe(true);
    // A second tap doesn't start another checkout.
    await fireEvent.press(screen.getByTestId("start-checkout"));
    expect(callsTo("/subscriptions/checkout")).toBe(1);
    expect(mockedOpen).toHaveBeenCalledTimes(1);
    view.unmount();
    await flush();
  });

  it("says the confirmation is late when the 20 s poll window runs out", async () => {
    mockApi(
      { subscription: null },
      { "/subscriptions/checkout": { url: "https://checkout.stripe.test/c" } },
    );
    mockedOpen.mockResolvedValue("success");
    const view = await renderScreen();

    await waitFor(() => {
      expect(checkoutButtonDisabled()).toBe(false);
    });
    // From here on the clock is fake; waitFor advances it (TanStack batches
    // its updates on a timer).
    jest.useFakeTimers();
    await fireEvent.press(screen.getByTestId("start-checkout"));
    await waitFor(() => {
      expect(screen.getByTestId("subscription-confirming")).toBeTruthy();
    });
    const readsBefore = callsTo("/subscriptions/me");

    // Poll by poll (every 2 s), letting each answer settle.
    for (let elapsed = 0; elapsed < 20_000; elapsed += 2_000) {
      await act(async () => {
        jest.advanceTimersByTime(2_000);
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId("subscription-confirmation-late")).toBeTruthy();
    });
    expect(screen.queryByTestId("subscription-confirming")).toBeNull();
    expect(callsTo("/subscriptions/me")).toBeGreaterThan(readsBefore);
    // The button comes back (the API's Stripe-side 409 guards a second one)…
    expect(checkoutButtonDisabled()).toBe(false);
    // …and the polling has stopped.
    const readsAfter = callsTo("/subscriptions/me");
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(callsTo("/subscriptions/me")).toBe(readsAfter);

    jest.useRealTimers();
    view.unmount();
    await flush();
  });

  it("cancels at the period end after confirming, then offers to reactivate", async () => {
    const scheduled = { ...ACTIVE, cancelScheduled: true };
    mockApi(
      { subscription: ACTIVE },
      { "/subscriptions/cancel": scheduled, "/subscriptions/reactivate": ACTIVE },
    );
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Ativa")).toBeTruthy();
    });
    expect(screen.queryByTestId("plan-MONTHLY")).toBeNull();
    await fireEvent.press(screen.getByTestId("cancel-subscription"));
    await fireEvent.press(
      await waitFor(() => screen.getByTestId("cancel-subscription-sheet-confirm")),
    );

    await waitFor(() => {
      expect(screen.getByText("Cancelamento agendado")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("reactivate-subscription"));
    await waitFor(() => {
      expect(screen.getByText("Ativa")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledWith("/subscriptions/reactivate", { method: "POST" });
    view.unmount();
    await flush();
  });

  it("shows a failed cancellation inside the sheet and re-reads the status", async () => {
    mockApi({ subscription: ACTIVE }, { "/subscriptions/cancel": newApiError(502) });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Ativa")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("cancel-subscription"));
    await fireEvent.press(
      await waitFor(() => screen.getByTestId("cancel-subscription-sheet-confirm")),
    );

    await waitFor(() => {
      expect(screen.getByText("Algo deu errado. Tente novamente.")).toBeTruthy();
    });
    // Still open, with the error in it (not behind the modal).
    expect(screen.getByTestId("cancel-subscription-sheet-confirm")).toBeTruthy();
    expect(screen.queryByTestId("subscription-error")).toBeNull();
    expect(
      mockedApiFetch.mock.calls.filter(([path]) => path === "/subscriptions/me").length,
    ).toBeGreaterThan(1);
    view.unmount();
    await flush();
  });

  it("sends a pending payment to Stripe's portal", async () => {
    mockApi(
      { subscription: { ...ACTIVE, status: "PAST_DUE" } },
      { "/subscriptions/portal": { url: "https://billing.stripe.test/p" } },
    );
    mockedOpen.mockResolvedValue("portal");
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Pagamento pendente")).toBeTruthy();
    });
    await fireEvent.press(screen.getByText("Atualizar forma de pagamento"));
    await waitFor(() => {
      expect(mockedOpen).toHaveBeenCalledWith("https://billing.stripe.test/p");
    });
    view.unmount();
    await flush();
  });
});
