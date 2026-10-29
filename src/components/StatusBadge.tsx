import React from "react";
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Utensils, 
  Activity, 
  Moon, 
  Share2 
} from "lucide-react";

interface StatusBadgeProps {
  type: "attendance" | "feeding" | "activity" | "nap" | "report";
  value: string;
}

export function StatusBadge({ type, value }: StatusBadgeProps) {
  if (type === "attendance") {
    switch (value) {
      case "present":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Presente
          </span>
        );
      case "absent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> Faltou
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" /> Esperado
          </span>
        );
    }
  }

  if (type === "feeding") {
    switch (value) {
      case "comeu_tudo":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Utensils className="w-3 h-3 text-emerald-600" /> Comeu tudo
          </span>
        );
      case "parcial":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Utensils className="w-3 h-3 text-amber-600" /> Parcial
          </span>
        );
      case "nao_comeu":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <Utensils className="w-3 h-3 text-rose-600" /> Não comeu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Não informado
          </span>
        );
    }
  }

  if (type === "report") {
    switch (value) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Finalizado
          </span>
        );
      case "shared":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#79B7DE]/20 text-[#25313B] border border-[#79B7DE]/40">
            <Share2 className="w-3 h-3 text-[#79B7DE]" /> Compartilhado
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Em preenchimento
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Rascunho
          </span>
        );
    }
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
      {value}
    </span>
  );
}

