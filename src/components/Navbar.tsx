"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ClipboardCheck, 
  Dog, 
  Users, 
  UserCheck, 
  BarChart3, 
  History, 
  Smartphone,
  Sparkles
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  // O portal do responsável possui cabeçalho próprio mobile-first
  if (pathname.startsWith("/portal")) {
    return null;
  }

  const navItems = [
    { label: "Rotina do Dia", href: "/rotina", icon: ClipboardCheck },
    { label: "Pets", href: "/pets", icon: Dog },
    { label: "Responsáveis", href: "/responsaveis", icon: Users },
    { label: "Equipe", href: "/funcionarios", icon: UserCheck },
    { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { label: "Histórico", href: "/historico", icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <Link href="/rotina" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#CD8DA7] to-[#79B7DE] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Dog className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-[#25313B] tracking-tight">Dermabichos</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#CD8DA7]/15 text-[#CD8DA7]">
                  Creche
                </span>
              </div>
              <p className="text-xs text-[#5B6570] font-medium hidden sm:block">Gestão & Acompanhamento Diário</p>
            </div>
          </Link>

          {/* Nav Links Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#79B7DE]/15 text-[#25313B] font-semibold border-b-2 border-[#79B7DE]"
                      : "text-[#5B6570] hover:text-[#25313B] hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#79B7DE]" : "text-[#8E9CA8]"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Portal do Tutor Action */}
          <div className="flex items-center gap-2">
            <Link
              href="/portal"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#CD8DA7] to-[#CD8DA7]/90 text-white shadow-xs hover:opacity-95 transition-all"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Portal do Tutor</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Sub-menu */}
      <div className="md:hidden flex overflow-x-auto border-t border-slate-100 px-2 py-1.5 gap-1 bg-slate-50 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                isActive
                  ? "bg-white shadow-xs text-[#25313B] font-semibold border border-slate-200"
                  : "text-[#5B6570]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
