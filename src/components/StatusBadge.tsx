import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  type: "attendance" | "feeding" | "activity" | "nap" | "report";
  value: string;
}

type Tone = "good" | "warn" | "bad" | "brand" | "neutral";

const tones: Record<Tone, { box: string; dot: string }> = {
  good: { box: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  warn: { box: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  bad: { box: "bg-rose-50 text-rose-800", dot: "bg-rose-500" },
  brand: { box: "bg-brand-blue-light text-brand-blue-ink", dot: "bg-brand-blue" },
  neutral: { box: "bg-slate-100 text-ink-soft", dot: "bg-slate-400" },
};

const labels: Record<StatusBadgeProps["type"], Record<string, [string, Tone]>> = {
  attendance: {
    present: ["Presente", "good"],
    absent: ["Faltou", "bad"],
    expected: ["Esperado", "neutral"],
  },
  feeding: {
    comeu_tudo: ["Comeu tudo", "good"],
    parcial: ["Comeu parte", "warn"],
    nao_comeu: ["Não comeu", "bad"],
    nao_observado: ["Não informado", "neutral"],
  },
  report: {
    completed: ["Concluído", "good"],
    shared: ["Enviado", "brand"],
    in_progress: ["Em preenchimento", "warn"],
    draft: ["Não iniciado", "neutral"],
  },
  nap: {
    sim: ["Descansou", "brand"],
    nao: ["Ficou ativo", "neutral"],
    nao_observado: ["Não informado", "neutral"],
  },
  activity: {
    participou: ["Participou", "good"],
    parcial: ["Participou em parte", "warn"],
    nao_participou: ["Não participou", "neutral"],
    nao_observado: ["Não informado", "neutral"],
  },
};

const fallback: Record<StatusBadgeProps["type"], string> = {
  attendance: "expected",
  feeding: "nao_observado",
  report: "draft",
  nap: "nao_observado",
  activity: "nao_observado",
};

/** Selo de status: ponto colorido + texto (a cor nunca é a única pista). */
export function StatusBadge({ type, value }: StatusBadgeProps) {
  const map = labels[type];
  const [label, tone] = map[value] || map[fallback[type]] || [value, "neutral"];
  const t = tones[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap", t.box)}>
      <span aria-hidden className={cn("w-1.5 h-1.5 rounded-full", t.dot)} />
      {label}
    </span>
  );
}
