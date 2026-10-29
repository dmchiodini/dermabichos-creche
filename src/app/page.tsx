import Link from "next/link";
import {
  Dog,
  UserCheck,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Lock
} from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-[#f0f7fc] flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xs flex-shrink-0 bg-white p-0.5 border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.svg"
                alt="Dermabichos Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-[#25313B]">Dermabichos</span>
                <span className="bg-[#CD8DA7]/15 text-[#CD8DA7] text-xs font-bold px-2 py-0.5 rounded-full">
                  Creche dos Baixinhos
                </span>
              </div>
              <p className="text-[11px] text-[#5B6570]">Gestão e acompanhamento diário</p>
            </div>
          </div>


        </div>
      </header>

      {/* Hero Header */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 text-center">
        <div className="flex justify-center mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            alt="Dermabichos Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xs"
          />
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-[#25313B] tracking-tight max-w-2xl mx-auto leading-tight mt-1">
          Acessos do Sistema Creche dos Baixinhos
        </h1>

        <p className="text-sm sm:text-base text-[#5B6570] max-w-xl mx-auto mt-2">
          Escolha seu perfil abaixo para acessar seu respectivo ambiente de trabalho ou consulta:
        </p>
      </section>

      {/* 3 Portals Cards Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. MONITOR DA CRECHE */}
        <div className="bg-white rounded-3xl border-2 border-[#79B7DE]/40 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#79B7DE]/10 rounded-full -mr-8 -mt-8 pointer-events-none" />

          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#79B7DE] text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#25313B]">Monitora da Creche</h2>
                <span className="bg-[#79B7DE]/15 text-[#79B7DE] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Operacional
                </span>
              </div>
              <p className="text-xs text-[#5B6570] mt-1.5 leading-relaxed">
                Ambiente exclusivo para o cuidador. Restrito <strong>estritamente ao dia de hoje</strong>.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-[#25313B]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Check-in e check-out com registro de horários</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Alimentação, atividades, soneca e comportamento</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Até 5 fotos por pet (retenção de 7 dias)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Compartilhamento direto no WhatsApp</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400 italic">
                <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>Sem acesso a histórico passado ou cadastros</span>
              </li>
            </ul>
          </div>

          <Link
            href="/monitora/login"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-xs text-white bg-[#79B7DE] hover:bg-[#5ea4d0] shadow-xs transition-colors"
          >
            <span>Entrar como Monitora</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 2. ADMINISTRADOR */}
        <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-slate-100 rounded-full -mr-8 -mt-8 pointer-events-none" />

          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#25313B] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-7 h-7 text-[#79B7DE]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#25313B]">Administração</h2>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Gestão Total
                </span>
              </div>
              <p className="text-xs text-[#5B6570] mt-1.5 leading-relaxed">
                Gestão completa de dados cadastrais, indicadores, histórico e equipe.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-[#25313B]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Cadastro e edição de pets e restrições</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Cadastro de tutores e vínculos de animais</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Gestão da equipe de monitores</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Dashboard de ocupação e taxa de presença</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Consulta a relatórios de <strong>qualquer data</strong></span>
              </li>
            </ul>
          </div>

          <Link
            href="/admin/login"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-xs text-white bg-[#25313B] hover:bg-slate-800 shadow-xs transition-colors"
          >
            <span>Entrar como Administrador</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3. PORTAL DO TUTOR */}
        <div className="bg-white rounded-3xl border-2 border-[#CD8DA7]/40 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#CD8DA7]/10 rounded-full -mr-8 -mt-8 pointer-events-none" />

          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#CD8DA7] to-[#b87791] text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#25313B]">Portal do Responsável</h2>
                <span className="bg-[#CD8DA7]/15 text-[#CD8DA7] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Cliente
                </span>
              </div>
              <p className="text-xs text-[#5B6570] mt-1.5 leading-relaxed">
                Área restrita onde o responsável acompanha em tempo real o dia do pet.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-[#25313B]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Visualização apenas do <strong>dia atual</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Apenas os cães vinculados ao tutor</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Horários de chegada, saída e alimentação</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Fotos do dia (disponíveis por até 7 dias)</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400 italic">
                <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>Sem acesso a outros cães ou histórico antigo</span>
              </li>
            </ul>
          </div>

          <Link
            href="/portal"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-xs text-white bg-[#CD8DA7] hover:bg-[#b87791] shadow-xs transition-colors"
          >
            <span>Acessar Portal do Responsável</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-[#5B6570]">
        Dermabichos Creche dos Baixinhos • Desenvolvido por DMCWeb
      </footer>
    </div>
  );
}
