"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dog, BarChart3, Users, UserCheck, History, LogOut, Sparkles, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { logout } from "@/services/auth-actions";
import { cn } from "@/lib/utils";

const adminNav = [
  { label: "Indicadores", href: "/admin/dashboard", icon: BarChart3 },
  { label: "Pets", href: "/admin/pets", icon: Dog },
  { label: "Responsáveis", href: "/admin/responsaveis", icon: Users },
  { label: "Atividades", href: "/admin/atividades", icon: Sparkles },
  { label: "Equipe", href: "/admin/funcionarios", icon: UserCheck },
  { label: "Histórico", href: "/admin/historico", icon: History },
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
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link href="/admin/dashboard" className="flex items-center gap-3 min-w-0 rounded-xl">
              <BrandLogo size="sm" />
              <span className="leading-tight min-w-0">
                <span className="block font-display font-extrabold text-ink">Dermabichos</span>
                <span className="block text-xs text-ink-soft">Administração</span>
              </span>
            </Link>

            <button type="button" onClick={handleLogout} disabled={loggingOut} className="btn btn-sm btn-ghost">
              {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

          {/* Abas: rolam na horizontal no celular */}
          <nav aria-label="Seções da administração" className="-mx-4 sm:mx-0 px-2 sm:px-0 flex overflow-x-auto no-scrollbar">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors",
                    isActive ? "text-ink" : "text-ink-soft hover:text-ink"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-brand-pink-ink" : "")} />
                  {item.label}
                  {isActive && (
                    <span aria-hidden className="absolute left-2 right-2 sm:left-3 sm:right-3 -bottom-px h-[3px] rounded-full bg-brand-pink" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter className="max-w-7xl mx-auto w-full sm:px-6 lg:px-8 border-t border-line" />
    </div>
  );
}
