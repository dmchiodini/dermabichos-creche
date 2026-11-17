"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dog, BarChart3, Users, UserCheck, History, LogOut, Sparkles, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { logout } from "@/services/auth-actions";
import { cn } from "@/lib/utils";

const adminNav = [
  { label: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
  { label: "Cadastros de Pets", href: "/admin/pets", icon: Dog },
  { label: "Responsáveis", href: "/admin/responsaveis", icon: Users },
  { label: "Atividades", href: "/admin/atividades", icon: Sparkles },
  { label: "Equipe", href: "/admin/funcionarios", icon: UserCheck },
  { label: "Histórico Geral", href: "/admin/historico", icon: History },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // A página de login do admin não exibe o cabeçalho de navegação.
  if (pathname === "/admin/login") return <>{children}</>;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout("admin");
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-ink text-white border-b border-slate-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5 min-w-0">
              <BrandLogo size="sm" className="border-transparent" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">Dermabichos</span>
                  <span className="bg-white/20 text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-100">
                    Administração
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate">Painel de Gestão & Indicadores</p>
              </div>
            </Link>

            {/* Links Desktop */}
            <nav aria-label="Navegação administrativa" className="hidden lg:flex items-center gap-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-white/15 text-white shadow-[inset_0_-2px_0_var(--color-brand-blue)]"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Icon className="w-4 h-4 text-brand-blue" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-200 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Encerrar Sessão</span>
            </button>
          </div>
        </div>

        {/* Menu Mobile/Tablet */}
        <nav
          aria-label="Navegação administrativa"
          className="lg:hidden flex overflow-x-auto border-t border-slate-700 px-2 py-1.5 gap-1 bg-ink-dark no-scrollbar"
        >
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap",
                  isActive ? "bg-white/20 text-white font-semibold" : "text-slate-300 hover:text-white"
                )}
              >
                <Icon className="w-3.5 h-3.5 text-brand-blue" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
