import { db, usersTable } from "@workspace/db";
import type { User } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

/** Get the application user row keyed by Clerk user id. */
export async function getUser(id: string): Promise<User | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return user ?? null;
}

/** Insert the user if missing, otherwise refresh the stored email. */
export async function upsertUser(
  id: string,
  email: string | null,
): Promise<User> {
  const [user] = await db
    .insert(usersTable)
    .values({ id, email })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...(email ? { email } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();
  return user!;
}

export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  await db
    .update(usersTable)
    .set({ stripeCustomerId, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
}

export interface SubscriptionSummary {
  active: boolean;
  status: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  subscriptionId: string | null;
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Look up the user's current subscription by their Stripe customer id, reading
 * from the `stripe` schema synced by stripe-replit-sync. Customer-based lookup
 * is robust: it does not depend on our own webhook bookkeeping.
 */
export async function getSubscriptionForUser(
  customerId: string | null,
): Promise<SubscriptionSummary> {
  const empty: SubscriptionSummary = {
    active: false,
    status: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    subscriptionId: null,
  };
  if (!customerId) return empty;

  // Match the environment's Stripe mode (live in deployments, sandbox in dev)
  // so stale rows synced from the other mode never grant entitlement.
  const wantLive =
    !process.env["REPL_IDENTITY"] && !!process.env["WEB_REPL_RENEWAL"];
  const result = await db.execute(
    sql`SELECT id, status, current_period_end, cancel_at_period_end
        FROM stripe.subscriptions
        WHERE customer = ${customerId}
          AND livemode = ${wantLive}
          AND status IN ('active', 'trialing', 'past_due')
        ORDER BY created DESC
        LIMIT 1`,
  );
  const row = result.rows[0] as
    | {
        id?: string;
        status?: string;
        current_period_end?: number | string | null;
        cancel_at_period_end?: boolean | null;
      }
    | undefined;
  if (!row?.status) return empty;

  const periodEnd =
    row.current_period_end != null ? Number(row.current_period_end) : null;
  return {
    active: ACTIVE_STATUSES.has(row.status),
    status: row.status,
    currentPeriodEnd: Number.isFinite(periodEnd) ? periodEnd : null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    subscriptionId: row.id ?? null,
  };
}

export interface ProductWithPrices {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  prices: {
    id: string;
    unitAmount: number | null;
    currency: string;
    interval: string | null;
  }[];
}

/** List active products with their active prices from the synced stripe schema. */
export async function listProductsWithPrices(): Promise<ProductWithPrices[]> {
  // In deployments the app uses the live Stripe account; in the dev workspace
  // it uses the sandbox. Filter by livemode so stale rows synced from the
  // other mode (e.g. old test data left in the table) never surface.
  const wantLive =
    !process.env["REPL_IDENTITY"] && !!process.env["WEB_REPL_RENEWAL"];
  const result = await db.execute(
    sql`
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.description AS product_description,
        p.metadata AS product_metadata,
        pr.id AS price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring
      FROM stripe.products p
      LEFT JOIN stripe.prices pr
        ON pr.product = p.id AND pr.active = true AND pr.livemode = ${wantLive}
      WHERE p.active = true AND p.livemode = ${wantLive}
      ORDER BY pr.unit_amount ASC NULLS LAST
    `,
  );

  const map = new Map<string, ProductWithPrices>();
  for (const raw of result.rows) {
    const row = raw as {
      product_id: string;
      product_name: string;
      product_description: string | null;
      product_metadata: Record<string, unknown> | null;
      price_id: string | null;
      unit_amount: number | string | null;
      currency: string | null;
      recurring: { interval?: string } | null;
    };
    let product = map.get(row.product_id);
    if (!product) {
      product = {
        id: row.product_id,
        name: row.product_name,
        description: row.product_description,
        metadata: row.product_metadata,
        prices: [],
      };
      map.set(row.product_id, product);
    }
    if (row.price_id) {
      product.prices.push({
        id: row.price_id,
        unitAmount:
          row.unit_amount != null ? Number(row.unit_amount) : null,
        currency: row.currency ?? "usd",
        interval: row.recurring?.interval ?? null,
      });
    }
  }
  return Array.from(map.values());
}
