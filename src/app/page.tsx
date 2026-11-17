import Link from "next/link";
import type { ReactNode } from "react";
import { UserCheck, ShieldCheck, Smartphone, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

type Portal = {
  title: string;
  tag: string;
  description: ReactNode;
  features: ReactNode[];
  restriction: string;
  href: string;
  cta: string;
  icon: ReactNode;
  accent: {
    border: string;
    glow: string;
    tag: string;
    button: string;
  };
};

const portals: Portal[] = [
  {
    title: "Monitora da Creche",
    tag: "Operacional",
    description: (
      <>
        Ambiente exclusivo para o cuidador. Restrito <strong>estritamente ao dia de hoje</strong>.
      </>
    ),
    features: [
      "Check-in e check-out com registro de horários",
      "Alimentação, rotina, soneca e comportamento",
      "Registros do dia (atividades e até 10 fotos por registro)",
      "Compartilhamento direto no WhatsApp",
    ],
    restriction: "Sem acesso a histórico passado ou cadastros",
    href: "/monitora/login",
    cta: "Entrar como Monitora",
    icon: (
      <div className="w-14 h-14 rounded-2xl bg-brand-blue text-white flex items-center justify-center shadow-xs">
        <UserCheck className="w-7 h-7" />
      </div>
    ),
    accent: {
      border: "border-brand-blue/40 hover:border-brand-blue",
      glow: "bg-brand-blue/10",
      tag: "bg-brand-blue/15 text-brand-blue-ink",
      button: "bg-brand-blue-ink hover:bg-ink",
    },
  },
  {
    title: "Administração",
    tag: "Gestão Total",
    description: "Gestão completa de dados cadastrais, indicadores, histórico e equipe.",
    features: [
      "Cadastro e edição de pets e restrições",
      "Cadastro de tutores e vínculos de animais",
      "Gestão da equipe de monitores",
      "Dashboard de ocupação e taxa de presença",
      <>
        Consulta a relatórios de <strong>qualquer data</strong>
      </>,
    ],
    restriction: "",
    href: "/admin/login",
    cta: "Entrar como Administrador",
    icon: (
      <div className="w-14 h-14 rounded-2xl bg-ink text-white flex items-center justify-center shadow-xs">
        <ShieldCheck className="w-7 h-7 text-brand-blue" />
      </div>
    ),
    accent: {
      border: "border-slate-300 hover:border-slate-400",
      glow: "bg-slate-100",
      tag: "bg-slate-100 text-slate-700",
      button: "bg-ink hover:bg-slate-800",
    },
  },
  {
    title: "Portal do Responsável",
    tag: "Cliente",
    description: "Área restrita onde o responsável acompanha em tempo real o dia do pet.",
    features: [
      <>
        Visualização apenas do <strong>dia atual</strong>
      </>,
      "Apenas os cães vinculados ao tutor",
      "Horários de chegada, saída e alimentação",
      "Registros do dia com fotos das atividades para download (até o final do dia)",
    ],
    restriction: "Sem acesso a outros cães ou histórico antigo",
    href: "/portal",
    cta: "Acessar Portal do Responsável",
    icon: (
      <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-brand-pink to-brand-pink-dark text-white flex items-center justify-center shadow-xs">
        <Smartphone className="w-7 h-7" />
      </div>
    ),
    accent: {
      border: "border-brand-pink/40 hover:border-brand-pink",
      glow: "bg-brand-pink/10",
      tag: "bg-brand-pink/15 text-brand-pink-ink",
      button: "bg-brand-pink-dark hover:bg-brand-pink-ink",
    },
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-linear-to-b from-white via-slate-50 to-brand-blue-light flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-3">
          <BrandLogo size="md" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-lg text-ink">Dermabichos</span>
              <span className="bg-brand-pink/15 text-brand-pink-ink text-xs font-bold px-2 py-0.5 rounded-full">
                Creche dos Baixinhos
              </span>
            </div>
            <p className="text-[11px] text-ink-soft">Gestão e acompanhamento diário</p>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 text-center animate-fade-in">
        <h1 className="text-3xl sm:text-5xl font-black text-ink tracking-tight max-w-2xl mx-auto leading-tight">
          Acessos do Sistema <br />
          <span className="bg-linear-to-r from-brand-pink-ink to-brand-blue-ink bg-clip-text text-transparent">
            Creche dos Baixinhos
          </span>
        </h1>
        <p className="text-sm sm:text-base text-ink-soft max-w-xl mx-auto mt-3">
          Escolha seu perfil abaixo para acessar seu respectivo ambiente de trabalho ou consulta:
        </p>
      </section>

      <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {portals.map((portal, i) => (
          <article
            key={portal.href}
            style={{ animationDelay: `${i * 70}ms` }}
            className={cn(
              "bg-white rounded-3xl border-2 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-6 relative overflow-hidden animate-pop-in",
              portal.accent.border
            )}
          >
            <div
              aria-hidden
              className={cn("absolute top-0 right-0 w-28 h-28 rounded-full -mr-8 -mt-8 pointer-events-none", portal.accent.glow)}
            />

            <div className="space-y-4 relative">
              {portal.icon}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-ink">{portal.title}</h2>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", portal.accent.tag)}>
                    {portal.tag}
                  </span>
                </div>
                <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">{portal.description}</p>
              </div>

              <ul className="space-y-2 text-xs text-ink">
                {portal.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-px" />
                    <span>{feature}</span>
                  </li>
                ))}
                {portal.restriction && (
                  <li className="flex items-start gap-2 text-slate-500 italic">
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-px" />
                    <span>{portal.restriction}</span>
                  </li>
                )}
              </ul>
            </div>

            <Link
              href={portal.href}
              className={cn(
                "group w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white shadow-xs transition-colors",
                portal.accent.button
              )}
            >
              <span>{portal.cta}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </article>
        ))}
      </section>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-ink-soft">
        Dermabichos Creche dos Baixinhos • Desenvolvido por DMCWeb
      </footer>
    </div>
  );
}
