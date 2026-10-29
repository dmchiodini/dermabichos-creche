"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Dog,
  BarChart3,
  Users,
  UserCheck,
  History,
  LogOut,
  ShieldCheck
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Não exibe o header de navegação na página de login do admin
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("dermabichos_admin_session");
    }
    router.push("/admin/login");
  };

  const adminNav = [
    { label: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
    { label: "Cadastros de Pets", href: "/admin/pets", icon: Dog },
    { label: "Responsáveis", href: "/admin/responsaveis", icon: Users },
    { label: "Equipe", href: "/admin/funcionarios", icon: UserCheck },
    { label: "Histórico Geral", href: "/admin/historico", icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-[#25313B] text-white border-b border-slate-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white p-0.5 flex-shrink-0 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon.svg"
                  alt="Dermabichos Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">Dermabichos</span>
                  <span className="bg-white/20 text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-200">
                    Administração
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Painel de Gestão & Indicadores</p>
              </div>
            </Link>

            {/* Links Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${isActive
                        ? "bg-white/15 text-white border-b-2 border-[#79B7DE]"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                  >
                    <Icon className="w-4 h-4 text-[#79B7DE]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Encerrar Sessão</span>
              </button>
            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        <div className="md:hidden flex overflow-x-auto border-t border-slate-700 px-2 py-1.5 gap-1 bg-[#1c262f] no-scrollbar">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${isActive
                    ? "bg-white/20 text-white font-semibold"
                    : "text-slate-300 hover:text-white"
                  }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#79B7DE]" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

