const API_BASE = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api`;

export interface PlanPrice {
  id: string;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  prices: PlanPrice[];
}

export interface SubscriptionSummary {
  active: boolean;
  status: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  subscriptionId: string | null;
}

async function authedFetch(
  path: string,
  token: string | undefined,
  init?: RequestInit,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export async function fetchPlans(token: string | undefined): Promise<Plan[]> {
  const res = await authedFetch("/billing/products", token);
  if (!res.ok) throw new Error(`Failed to load plans (HTTP ${res.status})`);
  const data = (await res.json()) as { products: Plan[] };
  return data.products ?? [];
}

export async function fetchSubscription(
  token: string | undefined,
): Promise<SubscriptionSummary> {
  const res = await authedFetch("/billing/subscription", token);
  if (!res.ok) throw new Error(`Failed to load subscription (HTTP ${res.status})`);
  return (await res.json()) as SubscriptionSummary;
}

export async function createCheckout(
  priceId: string,
  returnUrl: string,
  token: string | undefined,
): Promise<string> {
  const res = await authedFetch("/billing/checkout", token, {
    method: "POST",
    body: JSON.stringify({ priceId, returnUrl }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Checkout failed (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function createPortalSession(
  returnUrl: string,
  token: string | undefined,
): Promise<string> {
  const res = await authedFetch("/billing/portal", token, {
    method: "POST",
    body: JSON.stringify({ returnUrl }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Could not open billing portal (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}
