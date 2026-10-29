"use client";

import React, { useState, useEffect } from "react";
import { 
  getPets, 
  getAttendanceByDate, 
  getDailyReport 
} from "@/services/db-service";
import { getTodayDateString, formatDateBR, formatTimeBR } from "@/lib/date-utils";
import { Pet, Attendance, DailyReport } from "@/types/database.types";
import { PetAvatar } from "@/components/PetAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { 
  History, 
  Calendar, 
  Search, 
  AlertTriangle, 
  Utensils, 
  Clock, 
  Camera, 
  Heart 
} from "lucide-react";

export default function HistoricoPage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [pets, setPets] = useState<Pet[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [reports, setReports] = useState<Record<string, DailyReport>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOlderThan7Days, setIsOlderThan7Days] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(getTodayDateString());
      return;
    }

    // Calcula diferença de dias
    const today = new Date();
    const queryDate = new Date(selectedDate);
    const diffDays = (today.getTime() - queryDate.getTime()) / (1000 * 3600 * 24);
    setIsOlderThan7Days(diffDays > 7);

    async function load() {
      setLoading(true);
      const allPets = await getPets();
      setPets(allPets);

      const attList = await getAttendanceByDate(selectedDate);
      setAttendance(attList);

      const repMap: Record<string, DailyReport> = {};
      for (const p of allPets) {
        const r = await getDailyReport(p.id, selectedDate);
        if (r) repMap[p.id] = r;
      }
      setReports(repMap);
      setLoading(false);
    }
    load();
  }, [selectedDate]);

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
            <h1 className="text-xl sm:text-2xl font-bold text-[#25313B]">Consulta Histórica</h1>
            <span className="bg-[#79B7DE]/15 text-[#79B7DE] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Histórico
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5B6570] mt-0.5">
            Consulte os diários, alimentações e presenças registradas em qualquer data passada
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-[#CD8DA7]" />
          <span className="font-medium text-slate-500">Data Histórica:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="font-bold text-[#25313B] bg-transparent border-none focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Aviso de retenção de fotos em datas antigas */}
      {isOlderThan7Days && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950">Aviso de Retenção de Armazenamento</h4>
            <p className="mt-0.5 leading-relaxed">
              Esta data tem mais de 7 dias. Conforme a política de privacidade e retenção de arquivos da creche, as <strong>fotos temporárias foram excluídas automaticamente</strong>. Todos os registros textuais, presenças e relatórios permanecem arquivados permanentemente.
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar pet no histórico..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#79B7DE] shadow-2xs"
        />
      </div>

      {/* Grid de Registros Históricos */}
      {loading ? (
        <div className="text-center py-12 text-[#5B6570]">Buscando registros do dia...</div>
      ) : filteredPets.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
          <p className="text-sm font-semibold text-[#25313B]">Nenhum pet encontrado.</p>
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
                        <h3 className="font-bold text-base text-[#25313B] leading-tight">{pet.name}</h3>
                        <p className="text-xs text-[#5B6570]">{pet.breed || "SRD"}</p>
                      </div>
                    </div>
                    <StatusBadge type="attendance" value={att?.status || "expected"} />
                  </div>

                  {/* Informações de Presença no Dia */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Entrada</span>
                      <strong className="text-[#25313B]">
                        {att?.check_in_time ? formatTimeBR(att.check_in_time) : "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Saída</span>
                      <strong className="text-[#25313B]">
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

                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5 text-xs text-[#25313B]">
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
