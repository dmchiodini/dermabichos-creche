"use client";

import React, { useState, useEffect } from "react";
import { getDashboardData } from "@/services/db-service";
import { unwrap, errorMessage } from "@/lib/action-result";
import { useTodayDate } from "@/lib/use-today";
import { Pet, Attendance, DailyReport } from "@/types/database.types";
import { useFeedback } from "@/components/ui/Feedback";
import {
  Users,
  CheckCircle2,
  Share2,
  Activity,
  Sparkles,
  Calendar,
  Utensils,
  Loader2
} from "lucide-react";

export default function DashboardPage() {
  const { toast } = useFeedback();
  const today = useTodayDate();
  const [pickedDate, setSelectedDate] = useState<string>("");
  // Até o usuário escolher outra data, acompanha o dia de hoje.
  const selectedDate = pickedDate || today;
  const [referenceCapacity, setReferenceCapacity] = useState<number>(15); // Capacidade de referência simples
  const [pets, setPets] = useState<Pet[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Uma única ida ao servidor (as consultas rodam em paralelo lá).
        const { pets: allPets, attendance: attList, reports: dayReports } =
          await unwrap(getDashboardData(selectedDate));
        if (cancelled) return;
        const activePets = allPets.filter(p => p.status === "active");
        const activeIds = new Set(activePets.map(p => p.id));
        setPets(activePets);
        setAttendance(attList);
        setReports(dayReports.filter(r => activeIds.has(r.pet_id)));
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err, "Erro ao carregar indicadores."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedDate, toast]);

  // Cálculos explícitos e consistentes
  const totalPets = pets.length;
  const presentCount = attendance.filter(a => a.status === "present").length;

  // Taxa de presença com denominador válido
  const attendanceRate = totalPets > 0 ? Math.round((presentCount / totalPets) * 100) : 0;
  const capacityUsedPercent = referenceCapacity > 0 ? Math.round((presentCount / referenceCapacity) * 100) : 0;

  // Relatórios finalizados e compartilhados
  const completedReportsCount = reports.filter(r => r.status === "completed" || r.status === "shared").length;
  const sharedReportsCount = reports.filter(r => r.status === "shared").length;

  const completionPercent = presentCount > 0 ? Math.round((completedReportsCount / presentCount) * 100) : 0;
  const sharedPercent = presentCount > 0 ? Math.round((sharedReportsCount / presentCount) * 100) : 0;

  // Participação nas atividades
  const activeParticipationCount = reports.filter(r => r.activities_participation === "participou").length;

  // Alimentação
  const ateAllCount = reports.filter(r => r.feeding === "comeu_tudo").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Dashboard de Indicadores</h1>
            <span className="bg-brand-blue/15 text-brand-blue-ink text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Gestão
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Acompanhamento de taxa de presença, relatórios, capacidade e participação
          </p>
        </div>

        <div className="flex items-center gap-3">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-brand-blue-ink" aria-label="Carregando" />}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-brand-pink-ink" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              aria-label="Data dos indicadores"
              className="font-bold text-ink bg-transparent border-none focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
        {/* Taxa de Presença */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
            <span>Taxa de Presença</span>
            <Users className="w-4 h-4 text-brand-blue-ink" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-ink">{attendanceRate}%</span>
              <span className="text-xs text-slate-500">({presentCount} de {totalPets} cães)</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-brand-blue h-full rounded-full transition-all duration-500"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Capacidade Utilizada */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
            <span>Capacidade Utilizada</span>
            <Activity className="w-4 h-4 text-brand-pink-ink" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-ink">{capacityUsedPercent}%</span>
              <span className="text-xs text-slate-500">({presentCount} / {referenceCapacity} vagas)</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-brand-pink h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, capacityUsedPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Finalização dos Relatórios */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
            <span>Relatórios Concluídos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-ink">{completionPercent}%</span>
              <span className="text-xs text-slate-500">({completedReportsCount} de {presentCount || 1})</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Compartilhamento WhatsApp */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
            <span>Compartilhados</span>
            <Share2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-ink">{sharedPercent}%</span>
              <span className="text-xs text-slate-500">({sharedReportsCount} enviados)</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-brand-blue h-full rounded-full transition-all duration-500"
                style={{ width: `${sharedPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores Detalhados do Dia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desempenho de Bem-Estar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-base text-ink flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-pink-ink" />
            Indicadores de Rotina & Bem-Estar
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink">Apetite Pleno (Comeu Tudo)</p>
                  <p className="text-[11px] text-ink-soft">Pets com alimentação 100% consumida</p>
                </div>
              </div>
              <span className="text-sm font-black text-ink">{ateAllCount} pets</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-blue/20 text-brand-blue-ink flex items-center justify-center font-bold text-xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink">Participação Ativa</p>
                  <p className="text-[11px] text-ink-soft">Engajamento nos enriquecimentos ambientais</p>
                </div>
              </div>
              <span className="text-sm font-black text-ink">{activeParticipationCount} pets</span>
            </div>
          </div>
        </div>

        {/* Configuração Simples de Capacidade de Referência */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-blue-ink" />
              Capacidade de Referência da Creche
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              O administrador pode definir o limite de referência diário para monitorar a taxa de ocupação da unidade, sem necessidade de sistema de reservas.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-ink block">Capacidade Máxima Sugerida:</span>
              <span className="text-[11px] text-ink-soft">Vagas operacionais da unidade</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={referenceCapacity}
                onChange={(e) => setReferenceCapacity(Number(e.target.value) || 1)}
                className="w-16 p-2 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg"
              />
              <span className="text-xs text-ink-soft">cães</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
