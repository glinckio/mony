import * as WebBrowser from "expo-web-browser";

// Where the API's return URL (/subscriptions/return) sends the in-app
// browser once Stripe is done; openAuthSessionAsync closes on it.
const APP_RETURN_URL = "mony://subscription";

export type HostedPageResult = "success" | "canceled" | "portal" | "dismissed";

// Opens a Stripe-hosted page (Checkout or the Customer Portal) in the
// in-app browser and resolves when the user comes back. The app never
// shows a card form of its own.
export async function openHostedPage(url: string): Promise<HostedPageResult> {
  // Ephemeral (iOS): no Safari cookies shared with Stripe's page, and no
  // "wants to use … to sign in" prompt — this isn't a sign-in.
  const result = await WebBrowser.openAuthSessionAsync(url, APP_RETURN_URL, {
    preferEphemeralSession: true,
  });
  if (result.type !== "success") return "dismissed";
  const match = /[?&]result=(success|canceled|portal)\b/.exec(result.url);
  return (match?.[1] as HostedPageResult | undefined) ?? "dismissed";
}
