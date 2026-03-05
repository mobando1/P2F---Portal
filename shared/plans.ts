/**
 * Single source of truth for subscription plans and class packages.
 * Shared between server and client.
 */

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;       // in cents (e.g. 11996 = $119.96)
  classes: number;      // classes included per month
  description: string;
}

export interface ClassPackage {
  id: number;
  name: string;
  price: number;       // in cents
  classes: number;
}

export const SUBSCRIPTION_PLANS: Record<number, SubscriptionPlan> = {
  1: { id: 1, name: "Starter Flow",   price: 11996, classes: 4,  description: "4 clases por mes" },
  2: { id: 2, name: "Momentum Plan",  price: 21999, classes: 8,  description: "8 clases por mes" },
  3: { id: 3, name: "Fluency Boost",  price: 29999, classes: 12, description: "12 clases por mes" },
};

export const CLASS_PACKAGES: Record<number, ClassPackage> = {
  1: { id: 1, name: "5 Clases",  price: 14995, classes: 5 },
  2: { id: 2, name: "10 Clases", price: 27490, classes: 10 },
  3: { id: 3, name: "20 Clases", price: 49980, classes: 20 },
  4: { id: 4, name: "30 Clases", price: 74970, classes: 30 },
};

/**
 * Map from total checkout amount (cents) to package info.
 * Used by the webhook to identify direct-link purchases by amount.
 */
export const PACKAGE_BY_AMOUNT: Record<number, { name: string; classes: number }> = Object.fromEntries(
  Object.values(CLASS_PACKAGES).map(pkg => [pkg.price, { name: pkg.name, classes: pkg.classes }])
);
