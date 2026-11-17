import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIES, verifySession, type SessionRole } from "@/lib/auth/token";

/**
 * Verificação otimista de rota: impede abrir áreas restritas sem sessão válida.
 * A autorização definitiva continua em cada Server Action (`services/db-service.ts`).
 */
async function hasSession(request: NextRequest, role: SessionRole): Promise<boolean> {
  return !!(await verifySession(request.cookies.get(SESSION_COOKIES[role])?.value));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const area = pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/monitora") ? "staff" : null;
  if (!area) return NextResponse.next();

  const loginPath = area === "admin" ? "/admin/login" : "/monitora/login";
  const homePath = area === "admin" ? "/admin/dashboard" : "/monitora";
  const authorized =
    area === "admin"
      ? await hasSession(request, "admin")
      : (await hasSession(request, "staff")) || (await hasSession(request, "admin"));

  if (pathname === loginPath) {
    // Já autenticado: não faz sentido mostrar o login de novo.
    return authorized ? NextResponse.redirect(new URL(homePath, request.url)) : NextResponse.next();
  }

  if (!authorized) {
    const url = new URL(loginPath, request.url);
    if (pathname !== homePath) url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/monitora/:path*"],
};
