"use client";

import React, { useState, useEffect } from "react";
import { getDashboardData } from "@/services/db-service";
import { unwrap, errorMessage } from "@/lib/action-result";
import { useTodayDate } from "@/lib/use-today";
import { Pet, Attendance, DailyReport } from "@/types/database.types";
import { useFeedback } from "@/components/ui/Feedback";
import { Activity, Utensils, Loader2 } from "lucide-react";
import { PageShell, PageHeader } from "@/components/ui/Page";
import { formatDateBR } from "@/lib/date-utils";

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


  const isToday = selectedDate === today;

  return (
    <PageShell>
      <PageHeader
        title="Indicadores"
        description={isToday ? "Como está o dia de hoje na creche." : `Resumo do dia ${formatDateBR(selectedDate)}.`}
        actions={
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin text-brand-blue-ink" aria-label="Carregando" />}
            <label className="sr-only" htmlFor="dashboard-date">Data dos indicadores</label>
            <input
              id="dashboard-date"
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="field w-auto! font-bold"
            />
          </div>
        }
      />

      <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
        {/* Presença: o número que a gestão olha primeiro */}
        <section className="panel p-5 sm:p-7 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <h2 className="text-base font-bold text-ink-soft">Baixinhos presentes</h2>
            <p className="mt-1 font-display font-extrabold text-ink leading-none tabular">
              <span className="text-6xl sm:text-7xl">{presentCount}</span>
              <span className="text-2xl sm:text-3xl text-ink-soft"> de {totalPets}</span>
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              {totalPets > 0 ? `${attendanceRate}% dos baixinhos ativos vieram.` : "Nenhum baixinho ativo cadastrado."}
            </p>
            <Meter value={attendanceRate} className="mt-4 h-3" color="bg-brand-pink" label="Presença" />
          </div>

          <div className="rounded-2xl bg-brand-blue-light p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-ink">Ocupação</h2>
                <p className="text-xs text-ink-soft">Presentes em relação às vagas</p>
              </div>
              <p className="font-display text-3xl font-extrabold text-ink tabular">{capacityUsedPercent}%</p>
            </div>
            <Meter value={Math.min(100, capacityUsedPercent)} className="mt-3" color="bg-brand-blue-ink" label="Ocupação" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <label htmlFor="capacity" className="text-sm text-ink-soft">Vagas por dia</label>
              <input
                id="capacity"
                type="number"
                min="1"
                max="100"
                value={referenceCapacity}
                onChange={(e) => setReferenceCapacity(Number(e.target.value) || 1)}
                className="field w-20! text-center font-bold tabular"
              />
            </div>
          </div>
        </section>

        {/* Diários e bem-estar */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="panel p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">Diários dos presentes</h2>
            <dl className="mt-4 space-y-5">
              <Rate
                label="Concluídos"
                value={completionPercent}
                detail={`${completedReportsCount} de ${presentCount}`}
                color="bg-emerald-500"
              />
              <Rate
                label="Enviados no WhatsApp"
                value={sharedPercent}
                detail={`${sharedReportsCount} de ${presentCount}`}
                color="bg-brand-blue-ink"
              />
            </dl>
          </section>

          <section className="panel p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">Bem-estar</h2>
            <dl className="mt-2 divide-y divide-line">
              <Count icon={<Utensils className="w-4 h-4" />} label="Comeram toda a refeição" value={ateAllCount} />
              <Count icon={<Activity className="w-4 h-4" />} label="Participaram das atividades" value={activeParticipationCount} />
            </dl>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function Meter({ value, color, label, className = "h-2" }: { value: number; color: string; label: string; className?: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full rounded-full bg-white overflow-hidden ring-1 ring-inset ring-line ${className}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function Rate({ label, value, detail, color }: { label: string; value: number; detail: string; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm font-bold text-ink">{label}</dt>
        <dd className="text-sm text-ink-soft tabular">
          <span className="font-display text-xl font-extrabold text-ink">{value}%</span> ({detail})
        </dd>
      </div>
      <Meter value={value} color={color} label={label} className="mt-2 h-2" />
    </div>
  );
}

function Count({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <dt className="flex items-center gap-3 text-sm font-semibold text-ink">
        <span className="w-9 h-9 rounded-xl bg-brand-pink-light text-brand-pink-ink flex items-center justify-center">{icon}</span>
        {label}
      </dt>
      <dd className="font-display text-2xl font-extrabold text-ink tabular">
        {value} <span className="text-sm font-bold text-ink-soft font-sans">{value === 1 ? "baixinho" : "baixinhos"}</span>
      </dd>
    </div>
  );
}
