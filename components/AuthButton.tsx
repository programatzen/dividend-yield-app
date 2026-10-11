"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured, startGoogleLogin } from "@/lib/supabaseClient";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setChecked(true);
      return;
    }
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setChecked(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      setChecked(true);
    });
    const onFocus = () => {
      sb.auth.getSession().then(({ data }) => {
        if (alive) setUser(data.session?.user ?? null);
      });
    };
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function login() {
    if (busy) return;
    setBusy(true);
    try {
      const err = await startGoogleLogin();
      if (err) {
        alert(`No se pudo iniciar sesión: ${err}`);
        setBusy(false);
      }
      // Si va bien, el navegador redirige a Google; no se limpia busy.
    } catch {
      setBusy(false);
    }
  }

  async function logout() {
    await getSupabase()?.auth.signOut();
    setUser(null);
  }

  if (!checked) return <span className="text-sm text-zinc-400">…</span>;
  if (!configured)
    return (
      <span title="Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu entorno" className="rounded-full border border-dashed border-zinc-400 px-4 py-2 text-sm text-zinc-400">
        Login no configurado
      </span>
    );
  if (!user)
    return (
      <button onClick={login} disabled={busy} className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
        {busy ? "Redirigiendo…" : "Entrar con Google"}
      </button>
    );
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="max-w-40 truncate text-zinc-500">{user.email}</span>
      <button onClick={logout} className="rounded-full border border-zinc-300 px-4 py-2 dark:border-zinc-700">
        Salir
      </button>
    </div>
  );
}
