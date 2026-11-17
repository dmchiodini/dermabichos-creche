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
import {
  Calendar,
  Search,
  AlertTriangle,
  Clock,
  Camera
} from "lucide-react";

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Consulta Histórica</h1>
            <span className="bg-brand-blue/15 text-brand-blue-ink text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Histórico
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Consulte os diários, alimentações e presenças registradas em qualquer data passada
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-brand-pink-ink" />
          <span className="font-medium text-slate-500">Data Histórica:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            max={today || undefined}
            aria-label="Data histórica"
            className="font-bold text-ink bg-transparent border-none focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Aviso de retenção de fotos em datas antigas */}
      {isOlderThan7Days && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950">Aviso de Retenção de Armazenamento</h4>
            <p className="mt-0.5 leading-relaxed">
              Esta data tem mais de 7 dias. Conforme a política de privacidade e retenção de arquivos da creche, as <strong>fotos temporárias foram excluídas automaticamente</strong>. Todos os registros textuais, presenças e relatórios permanecem arquivados permanentemente.
            </p>
          </div>
        </div>
      )}

      {/* Registros do Dia (Atividades Coletivas da Data) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-pink/15 text-brand-pink-ink flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-ink">Registros do Dia ({activityLogs.length})</h2>
              <p className="text-xs text-ink-soft">Atividades e fotos postadas pela monitora na data selecionada</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
            {formatDateBR(selectedDate)}
          </span>
        </div>

        {activityLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Nenhuma atividade geral foi registrada nesta data.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activityLogs.map((act) => (
              <div key={act.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-ink">{act.title}</h3>
                  <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {formatTimeBR(act.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-100">
                  {act.description}
                </p>
                <div>
                  {isOlderThan7Days ? (
                    <p className="text-[11px] text-slate-400 italic flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Fotos temporárias desta data expiradas após o final do dia / 7 dias.
                    </p>
                  ) : act.photos && act.photos.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {act.photos.map((p, i) => (
                        <div key={p.id || i} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.storage_url || p.file_path} alt={p.caption || ""} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Sem fotos anexadas.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar pet no histórico..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-brand-blue shadow-2xs"
        />
      </div>

      {/* Grid de Registros Históricos */}
      {loading ? (
        <CardGridSkeleton label="Buscando registros do dia..." />
      ) : filteredPets.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
          <p className="text-sm font-semibold text-ink">Nenhum pet encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPets.map((pet) => {
            const att = attendance.find(a => a.pet_id === pet.id);
            const rep = reports[pet.id];

            return (
              <div
                key={pet.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <PetAvatar pet={pet} size="md" />
                      <div>
                        <h3 className="font-bold text-base text-ink leading-tight">{pet.name}</h3>
                        <p className="text-xs text-ink-soft">{pet.breed || "SRD"}</p>
                      </div>
                    </div>
                    <StatusBadge type="attendance" value={att?.status || "expected"} />
                  </div>

                  {/* Informações de Presença no Dia */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Entrada</span>
                      <strong className="text-ink">
                        {att?.check_in_time ? formatTimeBR(att.check_in_time) : "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Saída</span>
                      <strong className="text-ink">
                        {att?.check_out_time ? formatTimeBR(att.check_out_time) : "-"}
                      </strong>
                    </div>
                  </div>

                  {/* Detalhes do Relatório */}
                  {rep ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500">Status:</span>
                        <StatusBadge type="report" value={rep.status} />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5 text-xs text-ink">
                        <p><strong>Alimentação:</strong> {rep.feeding.replace("_", " ")} {rep.feeding_notes ? `(${rep.feeding_notes})` : ""}</p>
                        <p><strong>Atividades:</strong> {rep.activities_participation} {rep.activities_notes ? `(${rep.activities_notes})` : ""}</p>
                        {rep.behavior_socialization && (
                          <p><strong>Socialização:</strong> {rep.behavior_socialization}</p>
                        )}
                        {rep.free_observations && (
                          <p><strong>Observações:</strong> {rep.free_observations}</p>
                        )}
                      </div>

                      {/* Aviso das fotos */}
                      <div className="pt-1">
                        {isOlderThan7Days ? (
                          <p className="text-[11px] text-slate-400 italic flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Fotos expiradas após o prazo de armazenamento (7 dias).
                          </p>
                        ) : rep.photos && rep.photos.length > 0 ? (
                          <p className="text-[11px] text-emerald-700 font-medium">
                            📸 {rep.photos.length} fotos salvas (disponíveis no portal por 7 dias).
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400">Sem fotos anexadas neste dia.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Nenhum diário registrado para este cão na data.</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  Data: {formatDateBR(selectedDate)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
