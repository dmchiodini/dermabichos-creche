import { cn } from "@/lib/utils";

/** Rodapé padrão de todas as telas, com o crédito de desenvolvimento. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("px-4 py-6 text-xs text-ink-soft", className)}>
      Dermabichos, Creche dos Baixinhos. Desenvolvido por <span className="font-bold text-ink">DMCWeb</span>.
    </footer>
  );
}
