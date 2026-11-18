import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType } from "react";
import { ChevronRight, ClipboardList, LayoutDashboard } from "lucide-react";
import { AuthShell, AuthBrand } from "@/components/auth/AuthShell";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Acesso da equipe" };

type StaffEntry = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
};

const staffEntries: StaffEntry[] = [
  {
    title: "Monitora",
    description: "Check-in, rotina e fotos do dia",
    href: "/monitora/login",
    icon: ClipboardList,
    tone: "bg-brand-blue text-ink",
  },
  {
    title: "Administração",
    description: "Cadastros, equipe e indicadores",
    href: "/admin/login",
    icon: LayoutDashboard,
    tone: "bg-brand-pink text-ink",
  },
];

/**
 * Entrada exclusiva da equipe (/equipe). Não há link para cá a partir do portal:
 * o endereço principal (/) leva o responsável direto ao login do portal.
 */
export default function EquipePage() {
  return (
    <AuthShell>
      <AuthBrand caption="Creche dos Baixinhos" />

      <h1 className="mt-6 text-center text-[1.75rem] sm:text-3xl font-extrabold text-ink leading-tight">Acesso da equipe</h1>
      <p className="mt-2 text-center text-sm text-ink-soft">Escolha a sua área para entrar.</p>

      <ul className="mt-8 space-y-3">
        {staffEntries.map(({ title, description, href, icon: Icon, tone }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow,transform] duration-200 hover:border-transparent hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-18px_rgb(43_42_58/0.4)]"
            >
              <span className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", tone)}>
                <Icon className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display text-lg font-bold text-ink leading-tight">{title}</span>
                <span className="block text-sm text-ink-soft">{description}</span>
              </span>
              <ChevronRight className="w-5 h-5 text-ink-soft shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </li>
        ))}
      </ul>
    </AuthShell>
  );
}
