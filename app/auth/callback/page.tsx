"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase, startGoogleLogin } from "@/lib/supabaseClient";

// El intercambio del ?code= lo hace el middleware en el servidor; aquí solo se
// espera a que la sesión aparezca en el navegador y se redirige a /.
// Si no hay sesión (código viejo/recargado), se ofrece reintentar con un flujo fresco.
function Exchange() {
  const params = useSearchParams();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!params.get("code")) {
      router.replace("/");
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setFailed(true);
      return;
    }
    let alive = true;
    let tries = 0;
    const check = async () => {
      const { data } = await sb.auth.getSession();
      if (!alive) return;
      if (data.session) {
        router.replace("/");
        return;
      }
      if (++tries < 6) setTimeout(() => alive && void check(), 500);
      else setFailed(true);
    };
    void check();
    return () => {
      alive = false;
    };
  }, [params, router]);

  if (failed)
    return (
      <main className="space-y-3 p-8 text-sm">
        <p className="text-red-600">No se pudo completar el login (código expirado o ya usado).</p>
        <p className="text-zinc-500">Cada enlace de login sirve una sola vez: no recargues esta página ni uses el botón atrás.</p>
        <div className="flex gap-2">
          <button
            disabled={retrying}
            onClick={async () => {
              setRetrying(true);
              const err = await startGoogleLogin();
              if (err) {
                alert(`No se pudo iniciar sesión: ${err}`);
                setRetrying(false);
              }
            }}
            className="rounded-full bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {retrying ? "Redirigiendo…" : "Reintentar login"}
          </button>
          <a className="rounded-full border border-zinc-300 px-4 py-2 dark:border-zinc-700" href="/">Volver</a>
        </div>
      </main>
    );
  return <main className="p-8 text-sm text-zinc-500">Completando login…</main>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-zinc-500">Completando login…</main>}>
      <Exchange />
    </Suspense>
  );
}
