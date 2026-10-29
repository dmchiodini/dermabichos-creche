"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dog, Smartphone, ShieldCheck, UserCheck } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  // Esconder a navbar genérica nas áreas que possuem layout próprio segregado
  if (
    pathname.startsWith("/portal") ||
    pathname.startsWith("/monitora") ||
    pathname.startsWith("/admin") ||
    pathname === "/"
  ) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#CD8DA7] to-[#79B7DE] flex items-center justify-center text-white shadow-xs">
              <Dog className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg text-[#25313B]">Dermabichos Creche</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/monitora"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#79B7DE]/15 text-[#25313B] hover:bg-[#79B7DE]/25"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#79B7DE]" />
              <span>Área da Monitora</span>
            </Link>

            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#25313B] hover:bg-slate-200"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>Administração</span>
            </Link>

            <Link
              href="/portal"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#CD8DA7] text-white hover:bg-[#b87791]"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Portal do Responsável</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
