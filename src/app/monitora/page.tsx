"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getTodayDateString,
  formatDateBR,
  formatTimeBR
} from "@/lib/date-utils";
import {
  getPets,
  getAttendanceByDate,
  updateAttendance,
  getDailyReport,
  saveDailyReport,
  addDailyPhoto,
  removeDailyPhoto,
  getGuardiansForPet
} from "@/services/db-service";
import {
  Pet,
  Attendance,
  DailyReport,
  Guardian,
  FeedingStatus,
  WaterStatus,
  ActivityParticipation,
  NapStatus,
  ReportStatus
} from "@/types/database.types";
import { PetAvatar } from "@/components/PetAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { PhotoUploader } from "@/components/PhotoUploader";
import { WhatsAppShareModal } from "@/components/WhatsAppShareModal";
import {
  Dog,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  FileEdit,
  Share2,
  Search,
  Check,
  Save,
  Utensils,
  Flame,
  ShieldAlert,
  Calendar,
  Sparkles,
  UserCheck
} from "lucide-react";

export default function MonitoraPage() {
  const router = useRouter();
  const [monitorName, setMonitorName] = useState("Ana Paula");

  // A tela da monitora é ESTRITAMENTE restrita à data de HOJE
  const [todayDate, setTodayDate] = useState("");
  const [pets, setPets] = useState<Pet[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [reports, setReports] = useState<Record<string, DailyReport>>({});
  const [petGuardians, setPetGuardians] = useState<Record<string, Guardian[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "expected" | "absent">("all");

  // Pet selecionado para edição detalhada do relatório
  const [activePetId, setActivePetId] = useState<string | null>(null);
  const [activeReportDraft, setActiveReportDraft] = useState<Partial<DailyReport>>({});
  const [isSavingReport, setIsSavingReport] = useState(false);

  // Modal WhatsApp
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [petToShare, setPetToShare] = useState<Pet | null>(null);

  // Inicialização e checagem de sessão da monitora
  useEffect(() => {
    const today = getTodayDateString();
    setTodayDate(today);

    if (typeof window !== "undefined") {
      const savedSession = localStorage.getItem("dermabichos_staff_session");
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.name) setMonitorName(parsed.name);
        } catch {
          // fallback
        }
      }
    }

    async function loadTodayData() {
      setLoading(true);
      const allPets = await getPets();
      const activePets = allPets.filter(p => p.status === "active");
      setPets(activePets);

      const attList = await getAttendanceByDate(today);
      setAttendance(attList);

      const repMap: Record<string, DailyReport> = {};
      const guardMap: Record<string, Guardian[]> = {};

      for (const pet of activePets) {
        const rep = await getDailyReport(pet.id, today);
        if (rep) {
          repMap[pet.id] = rep;
        }
        const gList = await getGuardiansForPet(pet.id);
        guardMap[pet.id] = gList;
      }

      setReports(repMap);
      setPetGuardians(guardMap);
      setLoading(false);
    }

    loadTodayData();
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("dermabichos_staff_session");
    }
    router.push("/monitora/login");
  };

  // Abertura do editor de relatório de um pet
  const handleOpenReportEditor = (pet: Pet) => {
    setActivePetId(pet.id);
    const existing = reports[pet.id];
    if (existing) {
      setActiveReportDraft({ ...existing });
    } else {
      setActiveReportDraft({
        pet_id: pet.id,
        date: todayDate,
        status: "in_progress",
        feeding: "nao_observado",
        water: "nao_observado",
        activities_participation: "nao_observado",
        nap_after_lunch: "nao_observado",
        photos: [],
      });
    }
  };

  // Check-in rápido
  const handleQuickCheckIn = async (petId: string) => {
    const nowIso = new Date().toISOString();
    const updated = await updateAttendance(petId, todayDate, {
      status: "present",
      check_in_time: nowIso,
    });
    setAttendance(prev => {
      const filtered = prev.filter(a => a.pet_id !== petId);
      return [...filtered, updated];
    });
  };

  // Check-out rápido
  const handleQuickCheckOut = async (petId: string) => {
    const nowIso = new Date().toISOString();
    const updated = await updateAttendance(petId, todayDate, {
      check_out_time: nowIso,
    });
    setAttendance(prev => {
      const filtered = prev.filter(a => a.pet_id !== petId);
      return [...filtered, updated];
    });
  };

  // Salvar relatório
  const handleSaveActiveReport = async (newStatus?: ReportStatus) => {
    if (!activePetId) return;
    setIsSavingReport(true);

    const payload = {
      ...activeReportDraft,
      pet_id: activePetId,
      date: todayDate,
      status: newStatus || activeReportDraft.status || "in_progress",
    };

    const saved = await saveDailyReport(payload as DailyReport);

    setReports(prev => ({ ...prev, [activePetId]: saved }));
    setActiveReportDraft(saved);
    setIsSavingReport(false);
  };

  // Fotos da rotina
  const handleAddPhotoToDraft = async (url: string, caption?: string) => {
    if (!activePetId) return;
    const currentRep = reports[activePetId] || (await saveDailyReport({
      pet_id: activePetId,
      date: todayDate,
      status: "in_progress",
      feeding: "nao_observado",
      water: "nao_observado",
      activities_participation: "nao_observado",
      nap_after_lunch: "nao_observado",
    }));

    const newPhoto = await addDailyPhoto(currentRep.id, activePetId, url, caption);
    const updatedPhotos = [...(activeReportDraft.photos || []), newPhoto];
    setActiveReportDraft(prev => ({ ...prev, photos: updatedPhotos }));
    setReports(prev => ({
      ...prev,
      [activePetId]: {
        ...currentRep,
        photos: updatedPhotos
      }
    }));
  };

  const handleRemovePhotoFromDraft = async (photoId: string) => {
    if (!activePetId) return;
    const rep = reports[activePetId];
    if (rep) {
      await removeDailyPhoto(photoId, rep.id);
      const updatedPhotos = (activeReportDraft.photos || []).filter(p => p.id !== photoId);
      setActiveReportDraft(prev => ({ ...prev, photos: updatedPhotos }));
      setReports(prev => ({
        ...prev,
        [activePetId]: {
          ...rep,
          photos: updatedPhotos
        }
      }));
    }
  };

  // Abrir modal de WhatsApp
  const handleOpenWhatsAppShare = (pet: Pet) => {
    setPetToShare(pet);
    setShareModalOpen(true);
  };

  // Métricas do fechamento diário de HOJE
  const totalPets = pets.length;
  const presentCount = attendance.filter(a => a.status === "present").length;
  const completedReportsCount = Object.values(reports).filter(r => r.status === "completed" || r.status === "shared").length;
  const sharedReportsCount = Object.values(reports).filter(r => r.status === "shared").length;

  // Filtros
  const filteredPets = pets.filter(pet => {
    const matchesSearch = pet.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (pet.breed && pet.breed.toLowerCase().includes(searchFilter.toLowerCase()));

    const att = attendance.find(a => a.pet_id === pet.id);
    const petStatus = att?.status || "expected";

    if (statusFilter !== "all" && petStatus !== statusFilter) return false;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Exclusivo e Limpo da Monitora */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#79B7DE] flex items-center justify-center text-white shadow-xs">
              <Dog className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-[#25313B]">Dermabichos</span>
                <span className="bg-[#79B7DE]/15 text-[#79B7DE] text-[11px] font-bold px-2 py-0.5 rounded-md">
                  Rotina Operacional
                </span>
              </div>
              <p className="text-xs text-[#5B6570] flex items-center gap-1.5 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Monitora: <strong className="text-[#25313B]">{monitorName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Indicador fixo da data de hoje - SEM seletor de outras datas */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-[#25313B]">
              <Calendar className="w-3.5 h-3.5 text-[#CD8DA7]" />
              <span>Hoje: {formatDateBR(todayDate)}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal da Monitora */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Fechamento Diário de Hoje */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-[#5B6570] font-medium">Pets Presentes Hoje</p>
              <p className="text-2xl font-extrabold text-[#25313B] mt-0.5">
                {presentCount} <span className="text-xs font-normal text-slate-400">/ {totalPets}</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-[#5B6570] font-medium">Diários Finalizados</p>
              <p className="text-2xl font-extrabold text-[#25313B] mt-0.5">
                {completedReportsCount} <span className="text-xs font-normal text-slate-400">/ {presentCount || 1}</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#79B7DE]/15 text-[#79B7DE] flex items-center justify-center font-bold">
              <FileEdit className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-[#5B6570] font-medium">Compartilhados WhatsApp</p>
              <p className="text-2xl font-extrabold text-[#25313B] mt-0.5">
                {sharedReportsCount} <span className="text-xs font-normal text-slate-400">/ {presentCount || 1}</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#CD8DA7]/15 text-[#CD8DA7] flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-[#5B6570] font-medium">Pendentes de Conclusão</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-0.5">
                {Math.max(0, presentCount - completedReportsCount)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar pet..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#79B7DE] shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            {(["all", "present", "expected", "absent"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === st
                  ? "bg-[#25313B] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
              >
                {st === "all" ? "Todos os Pets" : st === "present" ? "Presentes" : st === "expected" ? "Esperados" : "Faltas"}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Pets da Rotina */}
        {loading ? (
          <div className="text-center py-12 text-[#5B6570]">Carregando rotina de hoje...</div>
        ) : filteredPets.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
            <p className="text-sm font-semibold text-[#25313B]">Nenhum pet encontrado neste filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPets.map((pet) => {
              const att = attendance.find(a => a.pet_id === pet.id);
              const rep = reports[pet.id];
              const isPresent = att?.status === "present";
              const isEditingThis = activePetId === pet.id;

              return (
                <div
                  key={pet.id}
                  className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden flex flex-col justify-between ${isEditingThis ? "border-[#79B7DE] ring-2 ring-[#79B7DE]/30" : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  {/* Header Card */}
                  <div className="p-4 border-b border-slate-100 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <PetAvatar pet={pet} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-[#25313B] leading-tight">{pet.name}</h3>
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {pet.size}
                            </span>
                          </div>
                          <p className="text-xs text-[#5B6570]">{pet.breed || "SRD"} • {pet.approximate_age}</p>
                        </div>
                      </div>

                      <StatusBadge type="attendance" value={att?.status || "expected"} />
                    </div>

                    {/* Alertas de dieta e saúde importantes para a monitora */}
                    {(pet.diet_restrictions || pet.allergies) && (
                      <div className="bg-[#CD8DA7]/10 border border-[#CD8DA7]/30 rounded-lg p-2 text-xs text-[#25313B] space-y-1">
                        {pet.diet_restrictions && (
                          <div className="flex items-center gap-1.5 font-medium text-[11px]">
                            <Utensils className="w-3.5 h-3.5 text-[#CD8DA7] flex-shrink-0" />
                            <span className="truncate"><strong>Dieta:</strong> {pet.diet_restrictions}</span>
                          </div>
                        )}
                        {pet.allergies && (
                          <div className="flex items-center gap-1.5 font-medium text-[11px] text-rose-700">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                            <span className="truncate"><strong>Alergia:</strong> {pet.allergies}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Controles Rápidos de Check-in e Check-out */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span>Entrada: <strong>{att?.check_in_time ? formatTimeBR(att.check_in_time) : "-"}</strong></span>
                        <span>•</span>
                        <span>Saída: <strong>{att?.check_out_time ? formatTimeBR(att.check_out_time) : "-"}</strong></span>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isPresent ? (
                          <button
                            type="button"
                            onClick={() => handleQuickCheckIn(pet.id)}
                            className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                          >
                            <LogIn className="w-3 h-3" /> Check-in
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickCheckOut(pet.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200"
                          >
                            <LogOut className="w-3 h-3 text-slate-400" /> Check-out
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resumo do Diário */}
                  <div className="p-4 bg-slate-50/60 flex-1 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#5B6570] font-medium">Status do Diário de Hoje:</span>
                      <StatusBadge type="report" value={rep?.status || "draft"} />
                    </div>

                    {rep && (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Alimentação</span>
                          <span className="font-semibold text-[#25313B]">
                            {rep.feeding === "comeu_tudo" ? "🥣 Comeu tudo" : rep.feeding === "parcial" ? "🍲 Parcial" : rep.feeding === "nao_comeu" ? "❌ Não comeu" : "Não inf."}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Fotos ({rep.photos?.length || 0}/5)</span>
                          <span className="font-semibold text-[#25313B]">
                            {rep.photos && rep.photos.length > 0 ? `📸 ${rep.photos.length} fotos` : "Sem fotos"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações da Monitora */}
                  <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReportEditor(pet)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-[#79B7DE]/15 hover:bg-[#79B7DE]/25 text-[#25313B] transition-colors"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-[#79B7DE]" />
                      <span>{rep ? "Editar Diário" : "Preencher Diário"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenWhatsAppShare(pet)}
                      disabled={!rep}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 disabled:opacity-40 transition-colors"
                      title="Compartilhar resumo por WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal / Drawer do Diário */}
        {activePetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  {activePetId && pets.find(p => p.id === activePetId) && (
                    <PetAvatar pet={pets.find(p => p.id === activePetId)!} size="md" />
                  )}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#25313B]">
                      Diário de Hoje: {pets.find(p => p.id === activePetId)?.name}
                    </h2>
                    <p className="text-xs text-[#5B6570]">
                      Data: {formatDateBR(todayDate)} • Registrado por {monitorName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePetId(null)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Formulário Operacional */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
                {/* Alimentação */}
                <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                  <label className="font-bold text-[#25313B] flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-[#CD8DA7]" /> Alimentação
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { val: "comeu_tudo", label: "Comeu tudo" },
                      { val: "parcial", label: "Comeu parcial" },
                      { val: "nao_comeu", label: "Não comeu" },
                      { val: "nao_observado", label: "Não observado" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setActiveReportDraft(prev => ({ ...prev, feeding: opt.val as FeedingStatus }))}
                        className={`p-2 rounded-lg border text-xs font-semibold text-center transition-colors ${activeReportDraft.feeding === opt.val
                          ? "bg-[#79B7DE] text-white border-[#79B7DE]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Observação da refeição (ex: Comeu toda ração às 12h)"
                    value={activeReportDraft.feeding_notes || ""}
                    onChange={(e) => setActiveReportDraft(prev => ({ ...prev, feeding_notes: e.target.value }))}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                {/* Atividades e Participação */}
                <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                  <label className="font-bold text-[#25313B] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#79B7DE]" /> Brincadeiras & Atividades
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { val: "participou", label: "Participou" },
                      { val: "parcial", label: "Parcial" },
                      { val: "nao_participou", label: "Não participou" },
                      { val: "nao_observado", label: "Livre" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setActiveReportDraft(prev => ({ ...prev, activities_participation: opt.val as ActivityParticipation }))}
                        className={`p-2 rounded-lg border text-xs font-semibold text-center transition-colors ${activeReportDraft.activities_participation === opt.val
                          ? "bg-[#79B7DE] text-white border-[#79B7DE]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Detalhes (ex: Brincadeiras de bolinha e circuito na grama)"
                    value={activeReportDraft.activities_notes || ""}
                    onChange={(e) => setActiveReportDraft(prev => ({ ...prev, activities_notes: e.target.value }))}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                {/* Descanso / Soneca pós almoço */}
                <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                  <label className="font-bold text-[#25313B] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#CD8DA7]" /> Soneca Pós-Almoço
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: "sim", label: "Sim, descansou" },
                      { val: "nao", label: "Ficou acordado" },
                      { val: "nao_observado", label: "Não observado" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setActiveReportDraft(prev => ({ ...prev, nap_after_lunch: opt.val as NapStatus }))}
                        className={`p-2 rounded-lg border text-xs font-semibold text-center transition-colors ${activeReportDraft.nap_after_lunch === opt.val
                          ? "bg-[#79B7DE] text-white border-[#79B7DE]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comportamento e Socialização */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#25313B]">Comportamento & Socialização:</label>
                  <input
                    type="text"
                    placeholder="Ex: Muito alegre, interagiu bem com a matilha"
                    value={activeReportDraft.behavior_socialization || ""}
                    onChange={(e) => setActiveReportDraft(prev => ({ ...prev, behavior_socialization: e.target.value }))}
                    className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>

                {/* Observações Livres */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#25313B]">Recadinho para o Tutor:</label>
                  <textarea
                    rows={2}
                    placeholder="Informações adicionais do dia..."
                    value={activeReportDraft.free_observations || ""}
                    onChange={(e) => setActiveReportDraft(prev => ({ ...prev, free_observations: e.target.value }))}
                    className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>

                {/* Fotos Temporárias (7 dias) */}
                <div className="border-t border-slate-200 pt-4">
                  <PhotoUploader
                    photos={activeReportDraft.photos || []}
                    onAddPhoto={handleAddPhotoToDraft}
                    onRemovePhoto={handleRemovePhotoFromDraft}
                    maxPhotos={5}
                  />
                </div>
              </div>

              {/* Ações */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveActiveReport("in_progress")}
                  disabled={isSavingReport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salvar Rascunho</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePetId(null)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveActiveReport("completed");
                      setActivePetId(null);
                    }}
                    disabled={isSavingReport}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#CD8DA7] text-white hover:bg-[#b87791] shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Finalizar Diário</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Compartilhamento WhatsApp */}
        {petToShare && reports[petToShare.id] && (
          <WhatsAppShareModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            pet={petToShare}
            report={reports[petToShare.id]}
            guardians={petGuardians[petToShare.id] || []}
            onShareInitiated={async () => {
              await handleSaveActiveReport("shared");
            }}
          />
        )}
      </main>
    </div>
  );
}
