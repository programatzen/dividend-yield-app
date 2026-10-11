"use client";

import { forwardRef } from "react";
import { MONTHS, formatMoney, monthlyTotalsForPortfolio, type Portfolio } from "@/lib/types";

interface Props {
  portfolio: Portfolio;
  year: number;
}

const DividendCalendar = forwardRef<HTMLDivElement, Props>(function DividendCalendar(
  { portfolio, year },
  ref
) {
  const totals = monthlyTotalsForPortfolio(portfolio);
  const fmt = (n: number) => formatMoney(n, portfolio.currency);
  const yearTotal = totals.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...totals);

  return (
    <div ref={ref} className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-xl font-semibold">{portfolio.name}</h2>
          <p className="text-sm text-zinc-500">Calendario de dividendos · {year} · {portfolio.currency}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Total anual estimado</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(yearTotal)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MONTHS.map((month, i) => {
          const value = totals[i];
          const pct = Math.round((value / max) * 100);
          return (
            <div key={month} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-500">{month}</p>
              <p className={`text-lg font-bold ${value > 0 ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-300 dark:text-zinc-700"}`}>
                {fmt(value)}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-zinc-400">Estimación: acciones × dividendo anual / nº de pagos. Datos locales, sin asesoría financiera.</p>
    </div>
  );
});

export default DividendCalendar;
