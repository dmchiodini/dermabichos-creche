import { cn } from "@/lib/utils";

/**
 * Bloco "fantasma" de carregamento. É um <span> com display block para poder ser
 * usado tanto em layouts quanto dentro de textos (<p>), onde <div> é HTML inválido.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-xl bg-slate-200/70", className)} />;
}

/** Grade de cartões "fantasma" exibida enquanto os dados carregam. */
export function CardGridSkeleton({ count = 6, label = "Carregando..." }: { count?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
