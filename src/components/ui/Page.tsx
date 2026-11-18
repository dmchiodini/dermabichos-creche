import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Contêiner padrão das páginas internas (admin). */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6", className)}>{children}</div>;
}

/**
 * Cabeçalho de página sem moldura: título grande, uma linha de contexto e as
 * ações à direita. `count` mostra o total ao lado do título, em tom discreto.
 */
export function PageHeader({
  title,
  description,
  count,
  actions,
}: {
  title: string;
  description?: ReactNode;
  count?: number;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[2rem] font-extrabold text-ink leading-tight">
          {title}
          {count !== undefined && (
            <span className="ml-2.5 align-middle text-base font-bold text-ink-soft tabular">{count}</span>
          )}
        </h1>
        {description && <p className="text-sm text-ink-soft mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

/** Campo de busca com ícone. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:max-w-sm", className)}>
      <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="field pl-10!"
      />
    </div>
  );
}

/** Estado vazio: diz o que falta e, quando houver, oferece a ação que resolve. */
export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel border-dashed px-6 py-10 sm:py-14 text-center", className)}>
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-brand-pink-light text-brand-pink-ink mx-auto mb-3 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {children && <p className="text-sm text-ink-soft max-w-md mx-auto mt-1">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
