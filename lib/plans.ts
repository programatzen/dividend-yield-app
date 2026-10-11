export type Plan = "gratis" | "base" | "plus" | "pro";

export const PLANS: Record<Plan, { label: string; maxCalendars: number; priceCLP: number }> = {
  gratis: { label: "Gratis", maxCalendars: 1, priceCLP: 0 },
  base: { label: "Base", maxCalendars: 2, priceCLP: 1000 },
  plus: { label: "Plus", maxCalendars: 5, priceCLP: 3000 },
  pro: { label: "Pro", maxCalendars: 10, priceCLP: 5000 },
};

export function normalizePlan(p: unknown): Plan {
  return p === "base" || p === "plus" || p === "pro" ? p : "gratis";
}
