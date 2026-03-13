// Single source of truth for plan and package details
// Used by Stripe webhooks, checkout, and subscription management

export const PLAN_DETAILS: Record<number, { name: string; classesIncluded: number }> = {
  1: { name: "Starter Flow", classesIncluded: 4 },
  2: { name: "Momentum Plan", classesIncluded: 8 },
  3: { name: "Fluency Boost", classesIncluded: 12 },
};

export const PACKAGE_DETAILS: Record<number, { name: string; classes: number }> = {
  1: { name: "5 Clases", classes: 5 },
  2: { name: "10 Clases", classes: 10 },
  3: { name: "20 Clases", classes: 20 },
  4: { name: "30 Clases", classes: 30 },
};

// For direct-link purchases (no metadata), map Stripe amount to package
export const AMOUNT_TO_PACKAGE: Record<number, { name: string; classes: number }> = {
  14995: { name: "5-Class Package", classes: 5 },
  27490: { name: "10-Class Package", classes: 10 },
  49980: { name: "20-Class Package", classes: 20 },
};
