import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refresca la sesión de Supabase en cada request (si está configurado).
// Además intercambia el ?code= de OAuth en el servidor (patrón oficial @supabase/ssr):
// la respuesta que renderiza /auth/callback ya lleva las cookies de sesión y el
// cliente solo las lee. El código es de un solo uso: recargar el callback con un
// ?code= viejo siempre fallará; la página muestra "Reintentar" en ese caso.
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const code = req.nextUrl.pathname === "/auth/callback" ? req.nextUrl.searchParams.get("code") : null;
  if (code) {
    await sb.auth.exchangeCodeForSession(code).catch(() => null);
    return res;
  }
  await sb.auth.getUser();
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
