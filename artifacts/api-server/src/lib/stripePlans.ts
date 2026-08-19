import type { ProductWithPrices } from "./stripeStorage";

const EXPECTED_PLAN_INTERVALS = ["month", "year"] as const;

export function hasCompletePlanCatalog(
  products: ProductWithPrices[] | null,
): products is ProductWithPrices[] {
  if (!products) return false;

  return products.some(
    (product) => {
      const intervals = new Set(
        product.prices.map((price) => price.interval).filter(Boolean),
      );
      return EXPECTED_PLAN_INTERVALS.every((interval) =>
        intervals.has(interval),
      );
    },
  );
}

export function hasAnyPlan(products: ProductWithPrices[] | null): boolean {
  return Boolean(products?.some((product) => product.prices.length > 0));
}