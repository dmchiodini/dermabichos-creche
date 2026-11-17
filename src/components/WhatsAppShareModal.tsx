"use client";

import React, { useMemo, useState } from "react";
import { MessageSquare, Check, Copy, AlertCircle } from "lucide-react";
import { DailyReport, Pet, Guardian } from "@/types/database.types";
import { formatDateBR } from "@/lib/date-utils";
import { recordReportShare } from "@/services/db-service";
import { Modal } from "@/components/ui/Modal";
import { useFeedback } from "@/components/ui/Feedback";
import { cn } from "@/lib/utils";

interface WhatsAppShareModalProps {
  report: DailyReport;
  pet: Pet;
  guardians: Guardian[];
  isOpen: boolean;
  onClose: () => void;
  onShareInitiated?: () => void;
}

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

const cleanPhone = (phone: string) => {
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 11 || clean.length === 10) {
    clean = "55" + clean;
  }
  return clean;
};

export function WhatsAppShareModal({
  report,
  pet,
  guardians,
  isOpen,
  onClose,
  onShareInitiated,
}: WhatsAppShareModalProps) {
  const { toast } = useFeedback();
  const [selectedGuardianId, setSelectedGuardianId] = useState<string | null>(guardians[0]?.id || null);
  const [copied, setCopied] = useState(false);

  const selectedGuardian = guardians.find((g) => g.id === selectedGuardianId) || guardians[0] || null;

  const messageText = useMemo(() => {
    const portalBase =
      typeof window !== "undefined" ? `${window.location.origin}/portal` : "https://dermabichos.vercel.app/portal";
    const portalUrlWithParam = selectedGuardian?.phone
      ? `${portalBase}?responsavel=${selectedGuardian.phone.replace(/\D/g, "")}`
      : portalBase;

    return `🐾 *Dermabichos Creche dos Baixinhos* - Resumo do Dia
🐶 *Pet:* ${pet.name}
📅 *Data:* ${formatDateBR(report.date)}

🥣 *Alimentação:* ${feedingMap[report.feeding] || report.feeding}${report.feeding_notes ? ` (${report.feeding_notes})` : ""}
🎾 *Atividades:* ${activityMap[report.activities_participation] || report.activities_participation}${report.activities_notes ? ` (${report.activities_notes})` : ""}
💤 *Descanso pós-almoço:* ${napMap[report.nap_after_lunch] || report.nap_after_lunch}${report.nap_notes ? ` (${report.nap_notes})` : ""}
✨ *Socialização:* ${report.behavior_socialization || "Excelente convivência com a matilha!"}
${report.free_observations ? `📝 *Observações:* ${report.free_observations}\n` : ""}
📸 *Fotos e Registros do Dia no Portal do Responsável:*
👉 ${portalUrlWithParam}
_(Lembrete: As fotos das atividades ficam disponíveis para download no portal até o final do dia)_

Um grande abraço de toda a equipe Dermabichos! 💖🐶`;
  }, [pet.name, report, selectedGuardian]);

  const handleOpenWhatsApp = () => {
    if (!selectedGuardian?.phone) {
      toast.error("Por favor, selecione ou cadastre o telefone do responsável.");
      return;
    }

    const waUrl = `https://wa.me/${cleanPhone(selectedGuardian.phone)}?text=${encodeURIComponent(messageText)}`;

    // Abre o WhatsApp imediatamente (dentro do clique), senão o iOS bloqueia como pop-up.
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // Registrar auditoria de compartilhamento iniciado (sem bloquear a abertura)
    recordReportShare({
      report_id: report.id,
      guardian_id: selectedGuardian.id,
      channel: "whatsapp",
      status: "initiated",
      recipient_phone: selectedGuardian.phone,
    }).catch(() => undefined);

    onShareInitiated?.();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto da prévia e copie manualmente.");
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      title="Compartilhar no WhatsApp"
      subtitle={`Relatório diário de ${pet.name}`}
      icon={
        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <MessageSquare className="w-4 h-4" />
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={!selectedGuardian?.phone}
            className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Abrir WhatsApp</span>
          </button>
        </div>
      }
    >
      <div className="p-4 sm:p-5 space-y-4">
        {/* Seleção do Responsável */}
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold text-ink mb-1.5">Destinatário (Responsável):</legend>
          {guardians.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {guardians.map((g) => (
                <label
                  key={g.id}
                  className={cn(
                    "flex items-center justify-between gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-colors",
                    selectedGuardian?.id === g.id
                      ? "border-brand-blue bg-brand-blue/10 font-semibold text-ink"
                      : "border-slate-200 hover:bg-slate-50 text-ink-soft"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="radio"
                      name="selected_guardian"
                      checked={selectedGuardian?.id === g.id}
                      onChange={() => setSelectedGuardianId(g.id)}
                      className="accent-brand-blue-ink"
                    />
                    <span className="truncate">{g.full_name}</span>
                  </div>
                  <span className="font-mono text-slate-500 shrink-0">{g.phone || "Sem telefone"}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Nenhum responsável vinculado a este pet. Cadastre um telefone antes de compartilhar.</span>
            </div>
          )}
        </fieldset>

        {/* Prévia da Mensagem */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Prévia da Mensagem:</span>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-xs text-brand-blue-ink hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado!" : "Copiar Texto"}
            </button>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-ink whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
            {messageText}
          </div>
        </div>

        <p className="text-[11px] text-ink-soft italic">
          * A ação abrirá o aplicativo do WhatsApp com a mensagem preenchida para revisão. O sistema registrará que o
          envio foi iniciado.
        </p>
      </div>
    </Modal>
  );
}
