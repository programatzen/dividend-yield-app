"use client";

import { useEffect, useRef, useState } from "react";
import type { Currency, Holding, Portfolio } from "./types";
import { normalizePlan, PLANS, type Plan } from "./plans";
import { getSupabase } from "./supabaseClient";

// En prerender (servidor) se usan IDs fijos; en cliente se regeneran con randomUUID.
function seed(staticIds = false): Portfolio[] {
  let n = 0;
  const uid = () => (staticIds ? `seed-${++n}` : crypto.randomUUID());
  return [
    {
      id: uid(),
      name: "Mi primer portafolio",
      currency: "USD",
      holdings: [
        {
          id: uid(),
          ticker: "KO",
          name: "Coca-Cola",
          kind: "accion",
          shares: 100,
          annualDividendPerShare: 1.94,
          payoutMonths: [3, 6, 9, 11],
        },
        {
          id: uid(),
          ticker: "VYM",
          name: "Vanguard High Dividend",
          kind: "etf",
          shares: 50,
          annualDividendPerShare: 3.5,
          payoutMonths: [2, 5, 8, 11],
        },
      ],
    },
    {
      id: uid(),
      name: "Portafolio Chile",
      currency: "CLP",
      holdings: [
        {
          id: uid(),
          ticker: "COPEC",
          name: "Copec",
          kind: "accion",
          shares: 200,
          annualDividendPerShare: 120,
          payoutMonths: [4, 10],
        },
      ],
    },
  ];
}

interface PortfolioRow {
  id: string;
  name: string;
  currency: Currency;
}

interface HoldingRow {
  id: string;
  portfolio_id: string;
  ticker: string;
  name: string;
  kind: Holding["kind"];
  shares: number;
  annual_dividend: number;
  payout_months: number[];
}

async function loadFromCloud(): Promise<Portfolio[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: user } = await sb.auth.getUser();
  if (!user.user) return [];
  const { data: ports, error: e1 } = await sb
    .from("portfolios")
    .select("id,name,currency")
    .order("created_at");
  if (e1) throw new Error(e1.message);
  if (!ports || ports.length === 0) return [];
  const { data: holds } = await sb
    .from("holdings")
    .select("id,portfolio_id,ticker,name,kind,shares,annual_dividend,payout_months")
    .in("portfolio_id", (ports as PortfolioRow[]).map((p) => p.id));
  const byPort = new Map<string, Holding[]>();
  for (const h of (holds ?? []) as HoldingRow[]) {
    const list = byPort.get(h.portfolio_id) ?? [];
    list.push({
      id: h.id,
      ticker: h.ticker,
      name: h.name,
      kind: h.kind,
      shares: Number(h.shares),
      annualDividendPerShare: Number(h.annual_dividend),
      payoutMonths: h.payout_months ?? [],
    });
    byPort.set(h.portfolio_id, list);
  }
  return (ports as PortfolioRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    currency: p.currency,
    holdings: byPort.get(p.id) ?? [],
  }));
}

async function loadSubscription(): Promise<Plan> {
  const sb = getSupabase();
  if (!sb) return "gratis";
  try {
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return "gratis";
    const { data, error } = await sb
      .from("subscriptions")
      .select("plan,status")
      .eq("user_id", user.user.id)
      .maybeSingle();
    if (error || !data || data.status !== "active") return "gratis";
    return normalizePlan((data as { plan: unknown }).plan);
  } catch {
    return "gratis"; // tabla aún no creada u otro error: plan gratis por defecto
  }
}

export function usePortfolios() {
  const [initial] = useState<Portfolio[]>(() => seed(true));
  const [portfolios, setPortfolios] = useState<Portfolio[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(initial[0]?.id ?? null);
  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("gratis");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const skipSave = useRef(true);

  function freshSeed() {
    const fresh = seed();
    setPortfolios(fresh);
    setActiveId(fresh[0]?.id ?? null);
  }

  // Sesión + carga inicial: logeado -> nube; invitado -> solo memoria (efímero).
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      freshSeed();
      setLoaded(true);
      return;
    }
    let alive = true;
    sb.auth.getUser().then(async ({ data }) => {
      if (!alive) return;
      if (!data.user) {
        freshSeed();
        setLoaded(true);
        return;
      }
      setUserId(data.user.id);
      setLoadError(null);
      try {
        const [cloud, sub] = await Promise.all([loadFromCloud(), loadSubscription()]);
        if (!alive) return;
        setPlan(sub);
        if (cloud.length > 0) {
          setPortfolios(cloud);
          setActiveId(cloud[0].id);
        } else {
          setPortfolios([]);
          setActiveId(null);
        }
      } catch (e) {
        if (!alive) return;
        // Error leyendo la nube (tablas/RLS): no se borra nada local, se avisa en UI.
        setLoadError(e instanceof Error ? e.message : "Error al cargar tu cuenta");
        freshSeed();
      }
      skipSave.current = true;
      setLoaded(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange(async (event, session) => {
      if (!alive) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null);
        setPlan("gratis");
        setLoadError(null);
        setSaveError(null);
        const fresh = seed();
        setPortfolios(fresh);
        setActiveId(fresh[0]?.id ?? null);
        skipSave.current = true;
      } else {
        setUserId(session.user.id);
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Autoguardado en la nube (solo logeado). Invitado: no se persiste nada.
  useEffect(() => {
    if (!loaded || !userId) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    const t = setTimeout(async () => {
      const { data: user } = await sb.auth.getUser();
      if (!user.user) return;
      setSaving(true);
      setSaveError(null);
      try {
        const fail = (msg: string) => { throw new Error(msg); };
        const { data: existing, error: eSel } = await sb.from("portfolios").select("id").eq("user_id", user.user.id);
        if (eSel) fail(eSel.message);
        const localIds = new Set(portfolios.map((p) => p.id));
        const toDelete = (((existing ?? []) as unknown as { id: string }[]).map((r) => r.id)).filter((id) => !localIds.has(id));
        if (toDelete.length > 0) {
          const { error: eDel } = await sb.from("portfolios").delete().in("id", toDelete);
          if (eDel) fail(eDel.message);
        }
        for (const p of portfolios) {
          const { error: eUp } = await sb.from("portfolios").upsert(
            { id: p.id, user_id: user.user.id, name: p.name, currency: p.currency },
            { onConflict: "id" }
          );
          if (eUp) fail(eUp.message);
          const { error: eDelH } = await sb.from("holdings").delete().eq("portfolio_id", p.id);
          if (eDelH) fail(eDelH.message);
          if (p.holdings.length > 0) {
            const { error: eIns } = await sb.from("holdings").insert(
              p.holdings.map((h) => ({
                id: h.id,
                portfolio_id: p.id,
                ticker: h.ticker,
                name: h.name,
                kind: h.kind,
                shares: h.shares,
                annual_dividend: h.annualDividendPerShare,
                payout_months: h.payoutMonths,
              }))
            );
            if (eIns) fail(eIns.message);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al guardar";
        console.error("[supabase] save failed:", msg);
        setSaveError(msg);
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [portfolios, loaded, userId]);

  const active = portfolios.find((p) => p.id === activeId) ?? null;

  function updateActive(mut: (p: Portfolio) => Portfolio) {
    if (!activeId) return;
    setPortfolios((prev) => prev.map((p) => (p.id === activeId ? mut(p) : p)));
  }

  return { portfolios, setPortfolios, active, activeId, setActiveId, updateActive, loaded, userId, plan, planLimit: PLANS[plan].maxCalendars, saving, saveError, loadError };
}
