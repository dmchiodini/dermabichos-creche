"use client";

import React, { useState, useEffect } from "react";
import { 
  getPets, 
  getAttendanceByDate, 
  getDailyReport 
} from "@/services/db-service";
import { getTodayDateString, formatDateBR } from "@/lib/date-utils";
import { Pet, Attendance, DailyReport } from "@/types/database.types";
import { 
  BarChart3, 
  Users, 
  CheckCircle2, 
  Share2, 
  AlertTriangle, 
  Activity, 
  Sparkles, 
  Calendar,
  Utensils,
  Moon,
  Info
} from "lucide-react";
import { PetAvatar } from "@/components/PetAvatar";

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [referenceCapacity, setReferenceCapacity] = useState<number>(15); // Capacidade de referência simples
  const [pets, setPets] = useState<Pet[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(getTodayDateString());
      return;
    }

    async function load() {
      setLoading(true);
      const allPets = await getPets();
      const activePets = allPets.filter(p => p.status === "active");
      setPets(activePets);

      const attList = await getAttendanceByDate(selectedDate);
      setAttendance(attList);

      const reps: DailyReport[] = [];
      for (const p of activePets) {
        const r = await getDailyReport(p.id, selectedDate);
        if (r) reps.push(r);
      }
      setReports(reps);
      setLoading(false);
    }
    load();
  }, [selectedDate]);

  // Cálculos explícitos e consistentes
  const totalPets = pets.length;
  const presentCount = attendance.filter(a => a.status === "present").length;
  const expectedCount = attendance.filter(a => a.status === "expected").length;
  const absentCount = attendance.filter(a => a.status === "absent").length;

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
            <h1 className="text-xl sm:text-2xl font-bold text-[#25313B]">Dashboard de Indicadores</h1>
            <span className="bg-[#79B7DE]/15 text-[#79B7DE] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Gestão
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5B6570] mt-0.5">
            Acompanhamento de taxa de presença, relatórios, capacidade e participação
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-[#CD8DA7]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="font-bold text-[#25313B] bg-transparent border-none focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de Presença */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5B6570]">
            <span>Taxa de Presença</span>
            <Users className="w-4 h-4 text-[#79B7DE]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#25313B]">{attendanceRate}%</span>
              <span className="text-xs text-slate-500">({presentCount} de {totalPets} cães)</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-[#79B7DE] h-full rounded-full transition-all duration-500"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Capacidade Utilizada */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5B6570]">
            <span>Capacidade Utilizada</span>
            <Activity className="w-4 h-4 text-[#CD8DA7]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#25313B]">{capacityUsedPercent}%</span>
              <span className="text-xs text-slate-500">({presentCount} / {referenceCapacity} vagas)</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-[#CD8DA7] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, capacityUsedPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Finalização dos Relatórios */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5B6570]">
            <span>Relatórios Concluídos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#25313B]">{completionPercent}%</span>
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
          <div className="flex items-center justify-between text-xs font-semibold text-[#5B6570]">
            <span>Compartilhados</span>
            <Share2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#25313B]">{sharedPercent}%</span>
              <span className="text-xs text-slate-500">({sharedReportsCount} enviados)</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-[#79B7DE] h-full rounded-full transition-all duration-500"
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
          <h3 className="font-bold text-base text-[#25313B] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#CD8DA7]" />
            Indicadores de Rotina & Bem-Estar
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#25313B]">Apetite Pleno (Comeu Tudo)</p>
                  <p className="text-[11px] text-[#5B6570]">Pets com alimentação 100% consumida</p>
                </div>
              </div>
              <span className="text-sm font-black text-[#25313B]">{ateAllCount} pets</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#79B7DE]/20 text-[#79B7DE] flex items-center justify-center font-bold text-xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#25313B]">Participação Ativa</p>
                  <p className="text-[11px] text-[#5B6570]">Engajamento nos enriquecimentos ambientais</p>
                </div>
              </div>
              <span className="text-sm font-black text-[#25313B]">{activeParticipationCount} pets</span>
            </div>
          </div>
        </div>

        {/* Configuração Simples de Capacidade de Referência */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-bold text-base text-[#25313B] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#79B7DE]" />
              Capacidade de Referência da Creche
            </h3>
            <p className="text-xs text-[#5B6570] leading-relaxed">
              O administrador pode definir o limite de referência diário para monitorar a taxa de ocupação da unidade, sem necessidade de sistema de reservas.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#25313B] block">Capacidade Máxima Sugerida:</span>
              <span className="text-[11px] text-[#5B6570]">Vagas operacionais da unidade</span>
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
              <span className="text-xs text-[#5B6570]">cães</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
