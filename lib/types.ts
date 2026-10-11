export type AssetKind = "accion" | "etf";

export type Currency = "USD" | "CLP" | "EUR" | "MXN" | "ARS" | "COP" | "PEN";

export const CURRENCIES: { code: Currency; label: string; locale: string }[] = [
  { code: "USD", label: "Dólar (USD)", locale: "en-US" },
  { code: "CLP", label: "Peso chileno (CLP)", locale: "es-CL" },
  { code: "EUR", label: "Euro (EUR)", locale: "es-ES" },
  { code: "MXN", label: "Peso mexicano (MXN)", locale: "es-MX" },
  { code: "ARS", label: "Peso argentino (ARS)", locale: "es-AR" },
  { code: "COP", label: "Peso colombiano (COP)", locale: "es-CO" },
  { code: "PEN", label: "Sol peruano (PEN)", locale: "es-PE" },
];

export function formatMoney(n: number, currency: Currency): string {
  const locale = CURRENCIES.find((c) => c.code === currency)?.locale ?? "es-ES";
  return n.toLocaleString(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  });
}

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  kind: AssetKind;
  shares: number;
  annualDividendPerShare: number;
  payoutMonths: number[]; // 0-11
}

export interface Portfolio {
  id: string;
  name: string;
  currency: Currency;
  holdings: Holding[];
}

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function monthlyIncomeForHolding(h: Holding): number[] {
  const result = new Array(12).fill(0);
  if (h.payoutMonths.length === 0 || h.shares <= 0 || h.annualDividendPerShare <= 0) return result;
  const perPayout = (h.shares * h.annualDividendPerShare) / h.payoutMonths.length;
  for (const m of h.payoutMonths) {
    if (m >= 0 && m < 12) result[m] += perPayout;
  }
  return result;
}

export function monthlyTotalsForPortfolio(p: Portfolio): number[] {
  const totals = new Array(12).fill(0);
  for (const h of p.holdings) {
    const m = monthlyIncomeForHolding(h);
    for (let i = 0; i < 12; i++) totals[i] += m[i];
  }
  return totals;
}
