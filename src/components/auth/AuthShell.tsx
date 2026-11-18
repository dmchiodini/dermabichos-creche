import Image from "next/image";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Moldura das telas de entrada (portal, equipe, logins): fundo com luz difusa
 * nas cores da marca e um cartão central.
 */
export function AuthShell({ children, top }: { children: ReactNode; top?: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden flex flex-col isolate">
      {/* Luz difusa rosa e azul */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-56 -left-48 w-[38rem] h-[38rem] rounded-full bg-brand-pink/55 blur-[120px]" />
        <div className="absolute -bottom-64 -right-48 w-[42rem] h-[42rem] rounded-full bg-brand-blue/60 blur-[130px]" />
        <div className="absolute top-[38%] left-[58%] w-72 h-72 rounded-full bg-brand-blue/25 blur-[100px]" />
      </div>

      {top && <div className="px-4 pt-5 sm:px-6">{top}</div>}

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md animate-pop-in">
          <div className="rounded-[2rem] bg-white/90 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_32px_80px_-32px_rgb(43_42_58/0.38)] px-6 py-8 sm:px-10 sm:py-10">
            {children}
          </div>
        </div>
      </main>

      <SiteFooter className="pt-0 text-center" />
    </div>
  );
}

/** Marca no topo do cartão: logo inteiro (sem recorte) e uma linha de contexto. */
export function AuthBrand({ caption }: { caption: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-[1.25rem] bg-white ring-1 ring-line p-1.5 shadow-[0_10px_24px_-12px_rgb(43_42_58/0.35)]">
        <Image src="/icon.svg" alt="Dermabichos" width={64} height={64} priority unoptimized className="w-full h-full object-contain" />
      </div>
      <p className="mt-3 text-sm font-bold text-ink-soft">{caption}</p>
    </div>
  );
}
