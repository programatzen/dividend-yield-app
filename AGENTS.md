# AGENTS.md — dividend-calendar-app

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4. `npm run dev|build|start`. Typecheck: `npx tsc --noEmit`.
- `npm run lint` (eslint) es lento en Windows; preferir `npx tsc --noEmit` + `npm run build` para verificar.

## Estructura
- `app/page.tsx`: página principal (Client Component). `app/layout.tsx` solo metadata + shell.
- `middleware.ts`: refresca sesión Supabase e intercambia el `?code=` de OAuth en el servidor (la página `/auth/callback` solo lee la sesión y redirige).
- `lib/types.ts`: tipos `Portfolio`/`Holding` + cálculo (`monthlyIncomeForHolding`, `monthlyTotalsForPortfolio`).
- `lib/store.ts`: hook `usePortfolios`. Invitado = estado efímero en memoria (sin `localStorage`); logeado = carga + autoguardado (debounce) en Supabase.
- `lib/supabaseClient.ts`: `getSupabase()` (null si faltan env) + `isSupabaseConfigured()` + `startGoogleLogin()`.
- `lib/plans.ts`: `PLANS` (gratis/1, base/2, plus/5, pro/10) + `normalizePlan()`. Límites solo en UI y solo para logeados.
- `components/DividendCalendar.tsx` (forwardRef, es el nodo que se exporta), `ExportButton.tsx` (`html-to-image/toPng`), `HoldingForm.tsx`, `AuthButton.tsx`.
- `docs/supabase-schema.sql`: schema + RLS (ejecutar en dashboard Supabase). `docs/supabase-subscriptions.sql`: tabla `subscriptions` + seed pro para programatzen@gmail.com. `.env.example`: vars requeridas.

## Modelo
- `Holding`: ticker, name, kind `accion|etf`, shares, annualDividendPerShare, payoutMonths `number[0-11]`.
- `Portfolio`: name, currency (`Currency`: USD, CLP, EUR, MXN, ARS, COP, PEN), holdings. Ver `CURRENCIES` + `formatMoney()` en `lib/types.ts` (CLP sin decimales).
- Ingreso mensual = `shares × annualDividend / payoutMonths.length` repartido en esos meses.
- `lib/store.ts` migra portafolios viejos sin moneda a USD.

## Gotchas
- No usar `new Date()` ni `crypto.randomUUID()` durante el render/prerender (rompe `next build`); año en `useEffect` (`app/page.tsx:year`), seed con IDs fijos en init + regeneración en cliente (`lib/store.ts`).
- Sin `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` la app funciona como invitado efímero; `getSupabase()` retorna null y el login muestra "no configurado". Nada se persiste sin sesión.
- `DividendCalendar` debe seguir siendo exportable a PNG: sin `oklch`/CSS exótico dentro del nodo, fondo sólido.
- UI en español. Sin backend: todo es local.
