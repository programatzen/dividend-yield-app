# Plan: login con Google (Supabase) + guardado + planes con MercadoPago

## Decisión base
- Login **opcional y solo para guardar**: sin login la app funciona, pero el calendario es **efímero** (no se persiste en ninguna memoria: ni `localStorage`, ni servidor).
- Con login (Google vía Supabase Auth) los calendarios se guardan en Postgres (Supabase).
- Pagos: **MercadoPago, suscripción mensual en CLP**. Tres planes pagados + gratis.

## Planes y límites
| Plan   | Precio mensual | Calendarios máx |
|--------|---------------|-----------------|
| Gratis | $0            | 1               |
| Base   | $1.000        | 2               |
| Plus   | $3.000        | 5               |
| Pro    | $5.000        | 10              |

- El límite del plan **gratis se valida solo en UI** (decisión explícita: se acepta que es burlable desde consola).
- Los límites de planes pagados también se validan en UI (misma regla simple); el servidor guarda el plan vigente pero no lo impone.
- Cada calendario conserva su moneda propia (USD, CLP, etc. — `CURRENCIES` actual).

## Arquitectura
- App sigue **estática** (prerender, sin SSR de datos). Supabase se usa solo desde el cliente (`@supabase/supabase-js`).
- Invitado: estado en memoria React, sin persistencia. Al pulsar "Guardar" se pide login.
- Logeado: CRUD contra Supabase; `localStorage` actual (`dividend-portfolios-v1`) **se elimina** del flujo (era del prototipo sin login).

## Esquema Supabase (propuesto)
- `portfolios(id uuid pk, user_id uuid fk auth.users, name text, currency text, created_at)` — índice por `user_id`.
- `holdings(id uuid pk, portfolio_id uuid fk portfolios cascade, ticker, name, kind, shares numeric, annual_dividend numeric, payout_months int[])`.
- `subscriptions(id uuid pk, user_id uuid unique, plan text, status text, mp_preapproval_id text, current_period_end timestamptz, updated_at)`.
  - `plan`: `gratis | base | plus | pro`. `status`: `active | paused | cancelled | expired`.
- RLS: `portfolios` y `holdings` solo del dueño (`auth.uid() = user_id`; holdings vía `EXISTS` sobre su portfolio). `subscriptions`: lectura propia; escritura solo service_role / Edge Function.

## Auth (Google)
1. Instalar `@supabase/supabase-js`, crear proyecto Supabase, activar provider Google (Client ID/Secret de Google Cloud, redirect a `https://<proyecto>.supabase.co/auth/v1/callback` + callback de la app `/auth/callback`).
2. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (más `SUPABASE_SERVICE_ROLE_KEY` solo en Edge Function, nunca en cliente).
3. Flujo: botón "Guardar mi calendario" → `signInWithOAuth({provider:'google'})` → callback crea sesión → si es primer login, ofrece importar el calendario efímero actual como portfolio nº 1.

## MercadoPago (suscripciones mensuales)
1. Cuenta MercadoPago + credenciales (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`).
2. Crear suscripción con API **preapproval** (`POST /preapproval`): `payer_email`, `reason` (nombre del plan), `auto_recurring { frequency: 1, frequency_type: 'months', transaction_amount, currency_id: 'CLP' }`, `back_url` (retorno a la app), `external_reference = user_id`.
   - Un `preapproval` por nivel: 1000 / 3000 / 5000.
   - Cambio de plan = cancelar preapproval actual + crear uno nuevo (MP no cambia monto de suscripción viva).
3. Webhook: configurar en MercadoPago la URL de una **Supabase Edge Function** (`/functions/v1/mp-webhook`) que valide la firma, consulte el `preapproval` en la API de MP y haga upsert en `subscriptions` (service_role). Eventos: creación, pago acreditado, cancelación/suspensión.
4. App: al volver de `back_url` (o por polling a `subscriptions`), refleja plan y nuevo límite. Botón "Cancelar suscripción" llama a `DELETE /preapproval/:id` vía Edge Function (no exponer el access token en cliente).
5. Baja: al cancelar/expirar, `plan` vuelve a `gratis`. Si el usuario tiene más calendarios que el límite, se bloquea **crear** nuevos (UI); los existentes se conservan en solo-lectura hasta que borre o re-suscriba.

## UI a construir (cuando se implemente)
- Header: estado (invitado / email + plan), botones Entrar / Salir.
- Aviso en modo invitado: "Tu calendario no se guarda. Entra con Google para guardarlo."
- Selector de plan + botón "Suscribirme" (checkout MP) + "Cancelar".
- Contador `n / límite` junto a "Crear calendario"; deshabilitar crear al llegar al tope con mensaje de upgrade.

## Fases
1. ✅ Supabase: schema + RLS + Auth Google + cliente en la app. **Hecho en código** (2026-10-11): `lib/supabaseClient.ts`, `components/AuthButton.tsx`, `app/auth/callback/route.ts`, `middleware.ts`, `.env.example`, SQL en `docs/supabase-schema.sql`. **Pendiente por el dueño**: crear proyecto Supabase, activar provider Google, ejecutar el SQL, definir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en el ambiente.
2. ✅ Persistencia logeada (portfolios/holdings) + **quitar `localStorage`**. **Hecho**: `lib/store.ts` — invitado 100% efímero en memoria (con seed de ejemplo), logeado carga de la nube y autoguardado con debounce 800ms (upsert + borrado de eliminados). Al cerrar sesión vuelve al seed efímero.
3. ✅ Tabla `subscriptions` + lectura de plan/límite en UI (gratis = 1, UI-only). **Hecho** (2026-10-11): `lib/plans.ts`, `docs/supabase-subscriptions.sql` (incluye seed `pro` para programatzen@gmail.com), badge de plan en header, contador `n/límite`, bloqueo de crear al tope (solo logeados), banners de error de carga/guardado. **Pendiente por el dueño**: ejecutar `docs/supabase-subscriptions.sql` en Supabase.
4. Edge Function webhook MP + alta/cancelación + UI de planes (1000/2, 3000/5, 5000/10).

## Riesgos conocidos
- Validación solo en UI: un usuario técnico puede superarla; aceptado por alcance.
- MercadoPago: los webhooks pueden demorar/repetirse → la Edge Function debe ser idempotente (upsert por `mp_preapproval_id`) y revalidar contra la API de MP.
- Sin login no hay nada que migrar después: si un invitado cierra la pestaña, pierde el calendario (es lo pedido; comunicarlo en UI).
