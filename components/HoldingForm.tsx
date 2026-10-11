"use client";

import { useState } from "react";
import { MONTHS, type AssetKind, type Holding } from "@/lib/types";

interface Props {
  initial?: Holding | null;
  currency: string;
  onSave: (h: Holding) => void;
  onCancel: () => void;
}

export default function HoldingForm({ initial, currency, onSave, onCancel }: Props) {
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<AssetKind>(initial?.kind ?? "accion");
  const [shares, setShares] = useState(String(initial?.shares ?? ""));
  const [div, setDiv] = useState(String(initial?.annualDividendPerShare ?? ""));
  const [months, setMonths] = useState<number[]>(initial?.payoutMonths ?? [2, 5, 8, 11]);

  function toggleMonth(m: number) {
    setMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort()));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return alert("Pon el ticker (ej. AAPL).");
    const s = Number(shares);
    const d = Number(div);
    if (!Number.isFinite(s) || s <= 0) return alert("Acciones debe ser mayor que 0.");
    if (!Number.isFinite(d) || d < 0) return alert("Dividendo anual inválido.");
    if (months.length === 0) return alert("Elige al menos un mes de pago.");
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      ticker: ticker.trim().toUpperCase(),
      name: name.trim() || ticker.trim().toUpperCase(),
      kind,
      shares: s,
      annualDividendPerShare: d,
      payoutMonths: months,
    });
  }

  const input = "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500">Ticker *</label>
          <input className={input} value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" />
        </div>
        <div>
          <label className="text-xs text-zinc-500">Nombre</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Apple" />
        </div>
        <div>
          <label className="text-xs text-zinc-500">Tipo</label>
          <select className={input} value={kind} onChange={(e) => setKind(e.target.value as AssetKind)}>
            <option value="accion">Acción</option>
            <option value="etf">ETF</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500">Nº acciones *</label>
          <input className={input} type="number" min="0" step="any" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="100" />
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-500">Dividendo anual por acción ({currency}) *</label>
        <input className={input} type="number" min="0" step="any" value={div} onChange={(e) => setDiv(e.target.value)} placeholder="1.94" />
      </div>
      <div>
        <p className="text-xs text-zinc-500">Meses de pago *</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {MONTHS.map((m, i) => (
            <button
              type="button"
              key={m}
              onClick={() => toggleMonth(i)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${months.includes(i) ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2 text-xs">
          <button type="button" className="underline" onClick={() => setMonths([0,1,2,3,4,5,6,7,8,9,10,11])}>Mensual</button>
          <button type="button" className="underline" onClick={() => setMonths([2,5,8,11])}>Trimestral</button>
          <button type="button" className="underline" onClick={() => setMonths([5,11])}>Semestral</button>
          <button type="button" className="underline" onClick={() => setMonths([11])}>Anual</button>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          {initial ? "Guardar cambios" : "Agregar"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}
