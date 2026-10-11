"use client";

import { useEffect, useRef, useState } from "react";
import AuthButton from "@/components/AuthButton";
import DividendCalendar from "@/components/DividendCalendar";
import ExportButton from "@/components/ExportButton";
import HoldingForm from "@/components/HoldingForm";
import { usePortfolios } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { PLANS } from "@/lib/plans";
import { CURRENCIES, MONTHS, formatMoney, monthlyIncomeForHolding, type Currency, type Holding, type Portfolio } from "@/lib/types";

export default function Home() {
  const { portfolios, setPortfolios, active, activeId, setActiveId, updateActive, loaded, userId, plan, planLimit, saving, saveError, loadError } = usePortfolios();
  const [editing, setEditing] = useState<Holding | null | "new" | undefined>(undefined);
  const [year, setYear] = useState(2026);
  useEffect(() => { setYear(new Date().getFullYear()); }, []);
  const [newName, setNewName] = useState("");
  const [newCurrency, setNewCurrency] = useState<Currency>("USD");
  const calRef = useRef<HTMLDivElement | null>(null);

  if (!loaded) return <main className="p-8 text-sm text-zinc-500">Cargando…</main>;

  function addPortfolio() {
    if (userId && portfolios.length >= planLimit) {
      alert(`Llegaste al límite de tu plan ${PLANS[plan].label} (${planLimit} calendario${planLimit > 1 ? "s" : ""}). Pronto podrás suscribirte a un plan mayor.`);
      return;
    }
    const name = newName.trim() || `Portafolio ${portfolios.length + 1}`;
    const p: Portfolio = { id: crypto.randomUUID(), name, currency: newCurrency, holdings: [] };
    setPortfolios((prev) => [...prev, p]);
    setActiveId(p.id);
    setNewName("");
  }

  function deletePortfolio(id: string) {
    if (!confirm("¿Eliminar este portafolio?")) return;
    setPortfolios((prev) => prev.filter((p) => p.id !== id));
    if (activeId === id) setActiveId(portfolios.find((p) => p.id !== id)?.id ?? null);
  }

  function saveHolding(h: Holding) {
    updateActive((p) => {
      const exists = p.holdings.some((x) => x.id === h.id);
      return { ...p, holdings: exists ? p.holdings.map((x) => (x.id === h.id ? h : x)) : [...p.holdings, h] };
    });
    setEditing(undefined);
  }

  function deleteHolding(id: string) {
    if (!confirm("¿Eliminar este activo?")) return;
    updateActive((p) => ({ ...p, holdings: p.holdings.filter((h) => h.id !== id) }));
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendario de Dividendos</h1>
          <p className="text-sm text-zinc-500">Crea portafolios, agrega acciones y ETFs, y exporta tu calendario en foto.</p>
        </div>
        <div className="flex items-center gap-2">
          {active && <ExportButton targetRef={calRef} fileName={`calendario-${active.name.toLowerCase().replace(/\s+/g, "-")}-${active.currency}-${year}`} />}
          {userId && (
            <span title={`Plan ${PLANS[plan].label}: hasta ${planLimit} calendarios`} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              Plan {PLANS[plan].label}
            </span>
          )}
          {userId && saving && <span className="text-xs text-zinc-400">Guardando…</span>}
          <AuthButton />
        </div>
      </header>

      {loadError && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          No se pudo cargar tu cuenta: {loadError}. Revisa que las tablas existan y el RLS (ver docs/*.sql). Tus cambios locales no se borraron.
        </p>
      )}
      {userId && saveError && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          Cambios no guardados en tu cuenta: {saveError}. Revisa tablas y políticas RLS en Supabase.
        </p>
      )}

      {!userId && isSupabaseConfigured() && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Modo invitado: tu calendario no se guarda en ningún lugar. Entra con Google para guardarlo en tu cuenta.
        </p>
      )}

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500">PORTAFOLIOS / CALENDARIOS</p>
          {userId && <p className="text-xs text-zinc-500">{portfolios.length} / {planLimit} calendarios (Plan {PLANS[plan].label})</p>}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {portfolios.map((p) => (
            <div key={p.id} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-sm ${p.id === activeId ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950" : "border-zinc-300 dark:border-zinc-700"}`}>
              <button onClick={() => setActiveId(p.id)} className="px-2 font-medium">{p.name} <span className="text-xs text-zinc-500">{p.currency}</span></button>
              <button onClick={() => deletePortfolio(p.id)} title="Eliminar" className="px-1 text-zinc-400 hover:text-red-500">×</button>
            </div>
          ))}
          {portfolios.length === 0 && <p className="text-sm text-zinc-500">Sin calendarios. Crea el primero abajo.</p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del nuevo calendario"
            className="w-full max-w-xs rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
          <select
            value={newCurrency}
            onChange={(e) => setNewCurrency(e.target.value as Currency)}
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
            title="Moneda"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <button onClick={addPortfolio} disabled={!!userId && portfolios.length >= planLimit} title={userId && portfolios.length >= planLimit ? `Límite del plan ${PLANS[plan].label} alcanzado` : undefined} className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900">
            Crear calendario
          </button>
        </div>
      </section>

      {active && (
        <>
          <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500">CONFIGURACIÓN DEL CALENDARIO ACTIVO</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-zinc-500">Nombre</label>
                <input
                  value={active.name}
                  onChange={(e) => updateActive((p) => ({ ...p, name: e.target.value }))}
                  className="block w-64 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Moneda</label>
                <select
                  value={active.currency}
                  onChange={(e) => updateActive((p) => ({ ...p, currency: e.target.value as Currency }))}
                  className="block rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <DividendCalendar ref={calRef} portfolio={active} year={year} />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Acciones y ETFs ({active.holdings.length})</h2>
              {editing === undefined && (
                <button onClick={() => setEditing("new")} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                  + Agregar activo
                </button>
              )}
            </div>

            {editing !== undefined && (
              <HoldingForm
                initial={editing === "new" ? null : editing}
                currency={active.currency}
                onSave={saveHolding}
                onCancel={() => setEditing(undefined)}
              />
            )}

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900">
                    <th className="px-3 py-2">Ticker</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Acciones</th>
                    <th className="px-3 py-2">Div./año</th>
                    <th className="px-3 py-2">Meses</th>
                    <th className="px-3 py-2">Ingreso/año</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {active.holdings.map((h) => {
                    const yearly = monthlyIncomeForHolding(h).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={h.id} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-3 py-2 font-bold">{h.ticker} <span className="font-normal text-zinc-500">{h.name}</span></td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${h.kind === "etf" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{h.kind.toUpperCase()}</span>
                        </td>
                        <td className="px-3 py-2">{h.shares}</td>
                        <td className="px-3 py-2">{formatMoney(h.annualDividendPerShare, active.currency)}</td>
                        <td className="px-3 py-2 text-xs text-zinc-500">{h.payoutMonths.map((m) => MONTHS[m].slice(0, 3)).join(", ")}</td>
                        <td className="px-3 py-2 font-medium text-emerald-600">{formatMoney(yearly, active.currency)}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => setEditing(h)} className="mr-2 underline">Editar</button>
                          <button onClick={() => deleteHolding(h.id)} className="text-red-500 underline">Eliminar</button>
                        </td>
                      </tr>
                    );
                  })}
                  {active.holdings.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">Sin activos. Agrega tu primera acción o ETF.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
