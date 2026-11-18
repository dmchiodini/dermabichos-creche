"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getHistoryData } from "@/services/db-service";
import { unwrap, errorMessage } from "@/lib/action-result";
import { formatDateBR, formatTimeBR } from "@/lib/date-utils";
import { useTodayDate } from "@/lib/use-today";
import { Pet, Attendance, DailyReport, DailyActivityLog } from "@/types/database.types";
import { PetAvatar } from "@/components/PetAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
import { Search, AlertTriangle, Loader2 } from "lucide-react";
import { PageShell, PageHeader, SearchField, EmptyState } from "@/components/ui/Page";

/** Diferença em dias entre duas datas YYYY-MM-DD (ambas no fuso de São Paulo). */
function daysBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

export default function HistoricoPage() {
  const { toast } = useFeedback();
  const today = useTodayDate();
  const [pickedDate, setSelectedDate] = useState<string>("");
  // Até o usuário escolher outra data, acompanha o dia de hoje.
  const selectedDate = pickedDate || today;
  const [pets, setPets] = useState<Pet[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [reports, setReports] = useState<Record<string, DailyReport>>({});
  const [activityLogs, setActivityLogs] = useState<DailyActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const isOlderThan7Days = useMemo(
    () => !!selectedDate && !!today && daysBetween(selectedDate, today) > 7,
    [selectedDate, today]
  );

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Uma única ida ao servidor (as consultas rodam em paralelo lá).
        const { pets: allPets, attendance: attList, reports: dayReports, activityLogs: logs } =
          await unwrap(getHistoryData(selectedDate));
        if (cancelled) return;
        setPets(allPets);
        setAttendance(attList);
        setReports(Object.fromEntries(dayReports.map(r => [r.pet_id, r])));
        setActivityLogs(logs);
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err, "Erro ao carregar o histórico."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedDate, toast]);

  const filteredPets = pets.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.breed && p.breed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <PageShell>
      <PageHeader
        title="Histórico"
        description="Presenças, diários e registros de qualquer dia anterior."
        actions={
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin text-brand-blue-ink" aria-label="Carregando" />}
            <label className="sr-only" htmlFor="history-date">Data</label>
            <input
              id="history-date"
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              max={today || undefined}
              className="field w-auto! font-bold"
            />
          </div>
        }
      />

      {isOlderThan7Days && (
        <div role="note" className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-950 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>As fotos deste dia já foram apagadas.</strong> Fotos ficam guardadas por 7 dias; textos, presenças e diários
            continuam aqui.
          </p>
        </div>
      )}

      {/* Registros do dia (atividades coletivas) */}
      <section aria-labelledby="hist-activities" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="hist-activities" className="text-xl font-bold text-ink">
            Registros do dia
            <span className="ml-2 text-base font-bold text-ink-soft tabular font-sans">{activityLogs.length}</span>
          </h2>
          <span className="text-sm text-ink-soft">{formatDateBR(selectedDate)}</span>
        </div>

        {activityLogs.length === 0 ? (
          <p className="panel border-dashed px-5 py-6 text-sm text-ink-soft">Nenhuma atividade foi registrada neste dia.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activityLogs.map((act) => (
              <li key={act.id} className="panel p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-ink leading-tight">{act.title}</h3>
                  <span className="text-sm font-bold text-ink-soft tabular shrink-0">{formatTimeBR(act.created_at)}</span>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{act.description}</p>
                {isOlderThan7Days ? null : act.photos && act.photos.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {act.photos.map((p, i) => (
                      <div key={p.id || i} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-brand-blue-light">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.storage_url || p.file_path} alt={p.caption || ""} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">Sem fotos.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Diário de cada cão */}
      <section aria-labelledby="hist-pets" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <h2 id="hist-pets" className="text-xl font-bold text-ink">Baixinhos</h2>
          <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Buscar pet" label="Buscar pet no histórico" />
        </div>

        {loading ? (
          <CardGridSkeleton label="Buscando registros do dia..." />
        ) : filteredPets.length === 0 ? (
          <EmptyState icon={<Search className="w-6 h-6" />} title="Nenhum pet encontrado">
            Confira a grafia ou limpe a busca.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPets.map((pet) => {
              const att = attendance.find(a => a.pet_id === pet.id);
              const rep = reports[pet.id];

              return (
                <li key={pet.id} className="panel p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <PetAvatar pet={pet} size="md" />
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-ink leading-tight truncate">{pet.name}</h3>
                        <p className="text-sm text-ink-soft">{pet.breed || "SRD"}</p>
                      </div>
                    </div>
                    <StatusBadge type="attendance" value={att?.status || "expected"} />
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-paper px-3 py-2">
                      <dt className="text-xs text-ink-soft">Chegada</dt>
                      <dd className="font-display text-lg font-bold text-ink tabular">
                        {att?.check_in_time ? formatTimeBR(att.check_in_time) : "–"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-paper px-3 py-2">
                      <dt className="text-xs text-ink-soft">Saída</dt>
                      <dd className="font-display text-lg font-bold text-ink tabular">
                        {att?.check_out_time ? formatTimeBR(att.check_out_time) : "–"}
                      </dd>
                    </div>
                  </dl>

                  {rep ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge type="report" value={rep.status} />
                        <StatusBadge type="feeding" value={rep.feeding} />
                        <StatusBadge type="activity" value={rep.activities_participation} />
                      </div>
                      <div className="space-y-1.5 text-ink leading-relaxed">
                        {rep.feeding_notes && <p><strong>Refeição:</strong> {rep.feeding_notes}</p>}
                        {rep.activities_notes && <p><strong>Atividades:</strong> {rep.activities_notes}</p>}
                        {rep.behavior_socialization && <p><strong>Comportamento:</strong> {rep.behavior_socialization}</p>}
                        {rep.free_observations && <p><strong>Recado:</strong> {rep.free_observations}</p>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-soft">Sem diário neste dia.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
