"use client";

import React, { useState } from "react";
import { MessageSquare, ExternalLink, Check, Copy, AlertCircle, X } from "lucide-react";
import { DailyReport, Pet, Guardian } from "@/types/database.types";
import { formatDateBR } from "@/lib/date-utils";
import { recordReportShare } from "@/services/db-service";

interface WhatsAppShareModalProps {
  report: DailyReport;
  pet: Pet;
  guardians: Guardian[];
  isOpen: boolean;
  onClose: () => void;
  onShareInitiated?: () => void;
}

export function WhatsAppShareModal({
  report,
  pet,
  guardians,
  isOpen,
  onClose,
  onShareInitiated,
}: WhatsAppShareModalProps) {
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(
    guardians[0] || null
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Montagem do texto do WhatsApp fiel aos fatos registrados
  const feedingMap: Record<string, string> = {
    comeu_tudo: "Comeu toda a refeição com ótimo apetite 🥣",
    parcial: "Comeu parcialmente 🍲",
    nao_comeu: "Não comeu a ração ⚠️",
    nao_observado: "Sem registro de alimentação",
  };

  const activityMap: Record<string, string> = {
    participou: "Super participativo nas brincadeiras e atividades 🎾",
    parcial: "Participou com moderação 🐾",
    nao_participou: "Preferiu descansar durante as atividades 💤",
    nao_observado: "Atividades livres",
  };

  const napMap: Record<string, string> = {
    sim: "Tirou uma gostosa sonequinha após o almoço 😴",
    nao: "Ficou acordado e ativo após o almoço",
    nao_observado: "Não observado",
  };

  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/portal` : "https://dermabichos.vercel.app/portal";

  const messageText = `🐾 *Dermabichos Creche Canina* - Resumo do Dia
🐶 *Pet:* ${pet.name}
📅 *Data:* ${formatDateBR(report.date)}

🥣 *Alimentação:* ${feedingMap[report.feeding] || report.feeding}${report.feeding_notes ? ` (${report.feeding_notes})` : ""}
🎾 *Atividades:* ${activityMap[report.activities_participation] || report.activities_participation}${report.activities_notes ? ` (${report.activities_notes})` : ""}
💤 *Descanso pós-almoço:* ${napMap[report.nap_after_lunch] || report.nap_after_lunch}${report.nap_notes ? ` (${report.nap_notes})` : ""}
✨ *Socialização:* ${report.behavior_socialization || "Excelente convivência com a matilha!"}
${report.free_observations ? `📝 *Observações:* ${report.free_observations}\n` : ""}
📸 *Fotos do dia e detalhes completos no Portal do Tutor:*
👉 ${portalUrl}
_(Lembrete: Fotos e momentos ficam disponíveis no portal por 7 dias)_

Um grande abraço de toda a equipe Dermabichos! 💖🐶`;

  const cleanPhone = (phone: string) => {
    let clean = phone.replace(/\D/g, "");
    if (clean.length === 11 || clean.length === 10) {
      clean = "55" + clean;
    }
    return clean;
  };

  const handleOpenWhatsApp = async () => {
    if (!selectedGuardian?.phone) {
      alert("Por favor, selecione ou cadastre o telefone do responsável.");
      return;
    }

    const phone = cleanPhone(selectedGuardian.phone);
    const encoded = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${phone}?text=${encoded}`;

    // Registrar auditoria de compartilhamento iniciado
    await recordReportShare({
      report_id: report.id,
      guardian_id: selectedGuardian.id,
      channel: "whatsapp",
      status: "initiated",
      recipient_phone: selectedGuardian.phone,
    });

    if (onShareInitiated) onShareInitiated();

    // Abrir WhatsApp
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#25313B]">Compartilhar no WhatsApp</h3>
              <p className="text-xs text-[#5B6570]">Relatório diário de {pet.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seleção do Responsável */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#25313B]">Destinatário (Responsável):</label>
          {guardians.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {guardians.map((g) => (
                <label
                  key={g.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedGuardian?.id === g.id
                      ? "border-[#79B7DE] bg-[#79B7DE]/10 font-semibold text-[#25313B]"
                      : "border-slate-200 hover:bg-slate-50 text-[#5B6570]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="selected_guardian"
                      checked={selectedGuardian?.id === g.id}
                      onChange={() => setSelectedGuardian(g)}
                      className="text-[#79B7DE]"
                    />
                    <span>{g.full_name}</span>
                  </div>
                  <span className="font-mono text-slate-500">{g.phone || "Sem telefone"}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Nenhum responsável vinculado a este pet. Cadastre um telefone antes de compartilhar.</span>
            </div>
          )}
        </div>

        {/* Prévia da Mensagem */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#25313B]">Prévia da Mensagem:</label>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-xs text-[#79B7DE] hover:underline flex items-center gap-1 font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado!" : "Copiar Texto"}
            </button>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-[#25313B] font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
            {messageText}
          </div>
        </div>

        {/* Aviso de conformidade técnica */}
        <p className="text-[11px] text-[#5B6570] italic">
          * A ação abrirá o aplicativo do WhatsApp com a mensagem preenchida para revisão. O sistema registrará que o envio foi iniciado.
        </p>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={!selectedGuardian?.phone}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Abrir WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}

