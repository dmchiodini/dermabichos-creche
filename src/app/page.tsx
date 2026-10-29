import Link from "next/link";
import { 
  Dog, 
  ClipboardCheck, 
  Smartphone, 
  ShieldCheck, 
  Camera, 
  HeartHandshake, 
  MessageSquare,
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#CD8DA7]/15 border border-[#CD8DA7]/30 text-xs font-bold text-[#CD8DA7]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gestão Especializada de Creche Canina</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-[#25313B] tracking-tight max-w-3xl mx-auto leading-tight">
          Cuidado, rotina diária e transparência para o seu petshop.
        </h1>

        <p className="text-sm sm:text-base text-[#5B6570] max-w-2xl mx-auto leading-relaxed">
          Plataforma ágil para registro operacional da rotina canina (alimentação, atividades, soneca, fotos) e portal seguro exclusivo para tutores acompanharem o dia em tempo real.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/rotina"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-[#79B7DE] to-[#5ea4d0] shadow-md hover:shadow-lg transition-all"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Acessar Rotina Operacional</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/portal"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-[#CD8DA7] to-[#b87791] shadow-md hover:shadow-lg transition-all"
          >
            <Smartphone className="w-4 h-4" />
            <span>Abrir Portal do Tutor</span>
          </Link>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#79B7DE]/15 text-[#79B7DE] flex items-center justify-center font-bold">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#25313B]">Rotina em Segundos</h3>
          <p className="text-xs text-[#5B6570] leading-relaxed">
            Interface otimizada para o monitor registrar presença, refeições, soneca pós-almoço e ocorrências sem burocracia ou formulários lentos.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#CD8DA7]/15 text-[#CD8DA7] flex items-center justify-center font-bold">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#25313B]">Fotos com Retenção de 7 Dias</h3>
          <p className="text-xs text-[#5B6570] leading-relaxed">
            Até 5 fotos por dia por pet, armazenadas com privacidade no Supabase Storage e excluídas automaticamente após uma semana.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#25313B]">Resumo WhatsApp & Portal</h3>
          <p className="text-xs text-[#5B6570] leading-relaxed">
            Compartilhe mensagens pré-formatadas diretamente no WhatsApp do tutor com link seguro para o portal do cliente.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-[#5B6570]">
        Dermabichos Creche Canina • Todos os direitos reservados.
      </footer>
    </div>
  );
}
