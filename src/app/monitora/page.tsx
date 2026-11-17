"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDateBR, formatTimeBR } from "@/lib/date-utils";
import { useTodayDate } from "@/lib/use-today";
import {
  getPets,
  getAttendanceByDate,
  updateAttendance,
  getDailyReportsByDate,
  saveDailyReport,
  getGuardiansByPet,
  getDailyActivityLogs,
  saveDailyActivityLog,
  deleteDailyActivityLog,
  addDailyActivityPhoto,
  removeDailyActivityPhoto,
  getActivityTemplates
} from "@/services/db-service";
import { getSessionInfo, logout } from "@/services/auth-actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import {
  Pet,
  Attendance,
  DailyReport,
  Guardian,
  FeedingStatus,
  ActivityParticipation,
  NapStatus,
  ReportStatus,
  DailyActivityLog,
  DailyActivityPhoto,
  ActivityTemplate
} from "@/types/database.types";
import { PetAvatar } from "@/components/PetAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { BrandLogo } from "@/components/BrandLogo";
import { ActivityPhotoUploader } from "@/components/ActivityPhotoUploader";
import { WhatsAppShareModal } from "@/components/WhatsAppShareModal";
import { Modal } from "@/components/ui/Modal";
import { CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
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
  UserCheck,
  Camera,
  Plus,
  Trash2,
  Edit3,
  Loader2
} from "lucide-react";

export default function MonitoraPage() {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [monitorName, setMonitorName] = useState("");

  // A tela da monitora é ESTRITAMENTE restrita à data de HOJE (também garantido no servidor)
  const todayDate = useTodayDate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [reports, setReports] = useState<Record<string, DailyReport>>({});
  const [petGuardians, setPetGuardians] = useState<Record<string, Guardian[]>>({});
  const [activityTemplates, setActivityTemplates] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "expected" | "absent">("all");
  const [busyPetId, setBusyPetId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Aba principal ativa: "activities" (Registros do Dia) ou "pets" (Rotina e Presença)
  const [activeMainTab, setActiveMainTab] = useState<"activities" | "pets">("activities");

  // Registros do dia (Atividades coletivas & Fotos)
  const [activityLogs, setActivityLogs] = useState<DailyActivityLog[]>([]);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityPhotos, setActivityPhotos] = useState<DailyActivityPhoto[]>([]);
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  // Pet selecionado para edição detalhada do relatório individual
  const [activePetId, setActivePetId] = useState<string | null>(null);
  const [activeReportDraft, setActiveReportDraft] = useState<Partial<DailyReport>>({});
  const [isSavingReport, setIsSavingReport] = useState(false);

  // Modal WhatsApp
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [petToShare, setPetToShare] = useState<Pet | null>(null);

  // Inicialização: sessão vem do servidor (cookie HTTP-only), não do localStorage
  useEffect(() => {
    getSessionInfo("staff")
      .then(async (s) => s || (await getSessionInfo("admin")))
      .then((s) => setMonitorName(s?.name || "Equipe"))
      .catch(() => setMonitorName("Equipe"));

    async function loadTodayData() {
      if (!todayDate) return;
      try {
        // Tudo em paralelo: 6 consultas no total (antes: 4 + 2 por pet, em sequência).
        const [allPets, attList, dayReports, guardMap, logs, tpls] = await Promise.all([
          unwrap(getPets()),
          unwrap(getAttendanceByDate(todayDate)),
          unwrap(getDailyReportsByDate(todayDate)),
          unwrap(getGuardiansByPet()),
          unwrap(getDailyActivityLogs(todayDate)),
          unwrap(getActivityTemplates(true)),
        ]);

        const activePets = allPets.filter(p => p.status === "active");
        const activeIds = new Set(activePets.map(p => p.id));
        setPets(activePets);
        setAttendance(attList);
        setReports(Object.fromEntries(dayReports.filter(r => activeIds.has(r.pet_id)).map(r => [r.pet_id, r])));
        setPetGuardians(guardMap);
        setActivityLogs(logs);
        setActivityTemplates(tpls);
      } catch (err) {
        toast.error(errorMessage(err, "Erro ao carregar a rotina de hoje."));
      } finally {
        setLoading(false);
      }
    }

    loadTodayData();
  }, [todayDate, toast]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout("staff");
    } finally {
      router.replace("/monitora/login");
      router.refresh();
    }
  };

  // -------------------------------------------------------------
  // CONTROLES DE REGISTROS DO DIA (ATIVIDADES & FOTOS)
  // -------------------------------------------------------------
  const resetActivityForm = () => {
    setEditingActivityId(null);
    setActivityTitle("");
    setActivityDescription("");
    setActivityPhotos([]);
  };

  const handleOpenNewActivity = () => {
    resetActivityForm();
    setActivityModalOpen(true);
  };

  const handleOpenEditActivity = (log: DailyActivityLog) => {
    setEditingActivityId(log.id);
    setActivityTitle(log.title);
    setActivityDescription(log.description);
    setActivityPhotos(log.photos || []);
    setActivityModalOpen(true);
  };

  const handleCloseActivityModal = async () => {
    // Fotos de um registro NOVO ainda não foram salvas: confirma antes de descartar.
    if (!editingActivityId && activityPhotos.length > 0) {
      const ok = await confirm({
        title: "Descartar este registro?",
        message: `As ${activityPhotos.length} foto(s) anexadas ainda não foram salvas.`,
        confirmLabel: "Descartar",
        danger: true,
      });
      if (!ok) return;
    }
    setActivityModalOpen(false);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) {
      toast.error("Por favor, digite o título da atividade.");
      return;
    }
    if (!activityDescription.trim()) {
      toast.error("Por favor, descreva como foi a atividade.");
      return;
    }

    setIsSavingActivity(true);
    try {
      const saved = await unwrap(saveDailyActivityLog({
        id: editingActivityId || undefined,
        date: todayDate,
        title: activityTitle.trim(),
        description: activityDescription.trim(),
        created_by_name: monitorName,
        photos: activityPhotos,
      }));

      setActivityLogs(prev => {
        const index = prev.findIndex(l => l.id === saved.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = saved;
          return updated;
        }
        return [...prev, saved];
      });

      toast.success(editingActivityId ? "Registro atualizado!" : "Registro publicado para os tutores!");
      setActivityModalOpen(false);
      resetActivityForm();
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Erro ao salvar registro de atividade."));
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleDeleteActivity = async (log: DailyActivityLog) => {
    const ok = await confirm({
      title: "Excluir este registro?",
      message: <>O registro <strong>{log.title}</strong> e suas {log.photos?.length || 0} foto(s) serão removidos do portal dos tutores.</>,
      confirmLabel: "Excluir registro",
      danger: true,
    });
    if (!ok) return;
    try {
      await unwrap(deleteDailyActivityLog(log.id));
      setActivityLogs(prev => prev.filter(l => l.id !== log.id));
      toast.success("Registro excluído.");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao excluir registro de atividade."));
    }
  };

  const handleAddPhotoToCurrentActivity = async (url: string, caption?: string) => {
    if (activityPhotos.length >= 10) {
      throw new Error("Limite máximo de 10 fotos por atividade atingido.");
    }

    if (editingActivityId) {
      const newPhoto = await unwrap(addDailyActivityPhoto(editingActivityId, url, caption));
      setActivityPhotos(prev => [...prev, newPhoto]);
      setActivityLogs(prev => prev.map(l => l.id === editingActivityId ? { ...l, photos: [...(l.photos || []), newPhoto] } : l));
    } else {
      // Registro novo: a foto fica no rascunho e é enviada ao salvar.
      const tempPhoto: DailyActivityPhoto = {
        id: crypto.randomUUID(),
        activity_log_id: "draft",
        file_path: `draft/${Date.now()}.jpg`,
        storage_url: url,
        caption: caption || null,
        created_at: new Date().toISOString(),
      };
      setActivityPhotos(prev => [...prev, tempPhoto]);
    }
  };

  const handleRemovePhotoFromCurrentActivity = async (photoId: string) => {
    if (editingActivityId) {
      await unwrap(removeDailyActivityPhoto(photoId, editingActivityId));
      setActivityLogs(prev => prev.map(l => l.id === editingActivityId ? { ...l, photos: (l.photos || []).filter(p => p.id !== photoId) } : l));
    }
    setActivityPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // -------------------------------------------------------------
  // CONTROLES DE DIÁRIOS INDIVIDUAIS DOS PETS
  // -------------------------------------------------------------
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

  const applyAttendance = (updated: Attendance) => {
    setAttendance(prev => [...prev.filter(a => a.pet_id !== updated.pet_id), updated]);
  };

  // Check-in rápido
  const handleQuickCheckIn = async (pet: Pet) => {
    setBusyPetId(pet.id);
    try {
      applyAttendance(await unwrap(updateAttendance(pet.id, todayDate, {
        status: "present",
        check_in_time: new Date().toISOString(),
      })));
      toast.success(`Check-in de ${pet.name} registrado.`);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao registrar check-in."));
    } finally {
      setBusyPetId(null);
    }
  };

  // Check-out rápido
  const handleQuickCheckOut = async (pet: Pet) => {
    setBusyPetId(pet.id);
    try {
      applyAttendance(await unwrap(updateAttendance(pet.id, todayDate, {
        check_out_time: new Date().toISOString(),
      })));
      toast.success(`Check-out de ${pet.name} registrado.`);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao registrar check-out."));
    } finally {
      setBusyPetId(null);
    }
  };

  // Salvar relatório individual
  const handleSaveActiveReport = async (newStatus?: ReportStatus): Promise<boolean> => {
    if (!activePetId) return false;
    setIsSavingReport(true);

    try {
      const saved = await unwrap(saveDailyReport({
        ...activeReportDraft,
        pet_id: activePetId,
        date: todayDate,
        status: newStatus || activeReportDraft.status || "in_progress",
      }));
      setReports(prev => ({ ...prev, [activePetId]: saved }));
      setActiveReportDraft(saved);
      toast.success(newStatus === "completed" ? "Diário concluído!" : "Rascunho salvo.");
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao salvar o diário."));
      return false;
    } finally {
      setIsSavingReport(false);
    }
  };

  // Marca o diário do pet compartilhado como "shared" (funciona a partir do card,
  // sem depender do editor estar aberto — antes o status nunca era atualizado).
  const markReportShared = async (pet: Pet) => {
    const current = reports[pet.id];
    if (!current) return;
    try {
      const saved = await unwrap(saveDailyReport({ ...current, pet_id: pet.id, date: todayDate, status: "shared" }));
      setReports(prev => ({ ...prev, [pet.id]: saved }));
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível marcar o diário como compartilhado."));
    }
  };

  // Abrir modal de WhatsApp
  const handleOpenWhatsAppShare = (pet: Pet) => {
    setPetToShare(pet);
    setShareModalOpen(true);
  };

  // Métricas do fechamento diário de HOJE
  const totalPets = pets.length;
  const attendanceByPet = useMemo(() => new Map(attendance.map(a => [a.pet_id, a])), [attendance]);
  const presentCount = useMemo(() => attendance.filter(a => a.status === "present").length, [attendance]);
  const { completedReportsCount, sharedReportsCount } = useMemo(() => {
    const list = Object.values(reports);
    return {
      completedReportsCount: list.filter(r => r.status === "completed" || r.status === "shared").length,
      sharedReportsCount: list.filter(r => r.status === "shared").length,
    };
  }, [reports]);

  // Filtros de pets
  const filteredPets = useMemo(() => {
    const term = searchFilter.trim().toLowerCase();
    return pets.filter(pet => {
      const matchesSearch = !term || pet.name.toLowerCase().includes(term) ||
        (pet.breed && pet.breed.toLowerCase().includes(term));
      const petStatus = attendanceByPet.get(pet.id)?.status || "expected";
      if (statusFilter !== "all" && petStatus !== statusFilter) return false;
      return matchesSearch;
    });
  }, [pets, searchFilter, statusFilter, attendanceByPet]);

  const activePet = activePetId ? pets.find(p => p.id === activePetId) : undefined;

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col pb-8">
      {/* Header Mobile-First da Monitora */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base text-ink">Dermabichos</span>
                <span className="bg-brand-blue/15 text-brand-blue-ink text-[10px] font-bold px-1.5 py-0.2 rounded">
                  Creche
                </span>
              </div>
              <p className="text-[11px] text-ink-soft flex items-center gap-1 font-medium">
                <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                {monitorName ? <span>{monitorName}</span> : <Skeleton className="h-3 w-20" />}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden xs:flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-[11px] font-bold text-ink">
              <Calendar className="w-3 h-3 text-brand-pink-ink shrink-0" />
              <span>{formatDateBR(todayDate)}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Sair"
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
            >
              {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 flex-1">
        {/* Fechamento Diário de Hoje - 4 cards com tipografia e espaçamento resistentes a mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-ink-soft font-medium leading-tight">Pets Presentes</p>
              <p className="text-xl sm:text-2xl font-black text-ink mt-0.5">
                {presentCount} <span className="text-xs font-normal text-slate-400">/ {totalPets}</span>
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-ink-soft font-medium leading-tight">Registros do Dia</p>
              <p className="text-xl sm:text-2xl font-black text-brand-pink-ink mt-0.5">
                {activityLogs.length} <span className="text-xs font-normal text-slate-400">ativ.</span>
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand-pink/15 text-brand-pink-ink flex items-center justify-center font-bold shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-ink-soft font-medium leading-tight">Diários Fechados</p>
              <p className="text-xl sm:text-2xl font-black text-brand-blue-ink mt-0.5">
                {completedReportsCount} <span className="text-xs font-normal text-slate-400">/ {presentCount || 1}</span>
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand-blue/15 text-brand-blue-ink flex items-center justify-center font-bold shrink-0">
              <FileEdit className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-ink-soft font-medium leading-tight">No WhatsApp</p>
              <p className="text-xl sm:text-2xl font-black text-ink mt-0.5">
                {sharedReportsCount} <span className="text-xs font-normal text-slate-400">/ {presentCount || 1}</span>
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        {/* Seletor de Abas Mobile-First (Estilo Segmented Control - NUNCA quebra em 3 linhas) */}
        <div className="bg-slate-200/80 p-1 rounded-2xl grid grid-cols-2 gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveMainTab("activities")}
            aria-pressed={activeMainTab === "activities"}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeMainTab === "activities"
                ? "bg-white text-brand-pink-ink shadow-xs"
                : "text-slate-600 hover:text-ink"
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="truncate">Registros do Dia</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold shrink-0 ${
              activeMainTab === "activities" ? "bg-brand-pink text-white" : "bg-slate-300 text-slate-700"
            }`}>
              {activityLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("pets")}
            aria-pressed={activeMainTab === "pets"}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeMainTab === "pets"
                ? "bg-white text-brand-blue-ink shadow-xs"
                : "text-slate-600 hover:text-ink"
            }`}
          >
            <Dog className="w-4 h-4 shrink-0" />
            <span className="truncate">Rotina dos Pets</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold shrink-0 ${
              activeMainTab === "pets" ? "bg-brand-blue text-white" : "bg-slate-300 text-slate-700"
            }`}>
              {presentCount}
            </span>
          </button>
        </div>

        {/* ============================================================= */}
        {/* ABA 1: REGISTROS DO DIA (GERAL / ATIVIDADES / ATÉ 10 FOTOS)   */}
        {/* ============================================================= */}
        {activeMainTab === "activities" && (
          <div className="space-y-4">
            {/* Top Bar da Aba de Atividades */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-ink">Registros do Dia</h2>
                  <span className="bg-brand-pink/15 text-brand-pink-ink text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
                    Geral
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-ink-soft mt-0.5 leading-snug">
                  Crie atividades com fotos para os tutores baixarem até o encerramento do dia.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenNewActivity}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-pink hover:bg-brand-pink-dark text-white shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Registro do Dia</span>
              </button>
            </div>

            {/* Lista de Atividades Registradas Hoje */}
            {loading ? (
              <div className="space-y-4" role="status" aria-label="Carregando atividades de hoje">
                {[0, 1].map(i => (
                  <div key={i} className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-16 w-full" />
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {[0, 1, 2].map(j => <Skeleton key={j} className="aspect-square" />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="bg-white p-8 sm:p-12 rounded-3xl text-center border border-slate-200 shadow-2xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-pink/10 text-brand-pink-ink mx-auto flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base text-ink">Nenhum registro postado hoje</h3>
                <p className="text-xs text-ink-soft max-w-md mx-auto">
                  Ainda não há atividades registradas para hoje. Clique no botão abaixo para postar a primeira brincadeira ou momento com fotos da matilha!
                </p>
                <button
                  type="button"
                  onClick={handleOpenNewActivity}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-pink text-white hover:bg-brand-pink-dark transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Primeiro Registro</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activityLogs.map((log, index) => (
                  <div
                    key={log.id}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3 hover:border-slate-300 transition-all"
                  >
                    {/* Header da Atividade - sem quebra de linhas confusa no mobile */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-md bg-brand-pink/15 text-brand-pink-ink flex items-center justify-center text-[11px] font-black shrink-0">
                            #{index + 1}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-ink leading-tight">
                            {log.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-ink-soft">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatTimeBR(log.created_at)}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-brand-blue-ink">📸 {log.photos?.length || 0} fotos</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditActivity(log)}
                          aria-label={`Editar ${log.title}`}
                          className="p-2 rounded-lg text-slate-500 hover:text-brand-blue-ink hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Editar atividade"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(log)}
                          aria-label={`Excluir ${log.title}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir atividade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Descrição */}
                    <p className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      {log.description}
                    </p>

                    {/* Galeria de Fotos (3 colunas compactas no celular) */}
                    <div>
                      {log.photos && log.photos.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1">
                          {log.photos.map((photo, i) => (
                            <div
                              key={photo.id || i}
                              className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-2xs"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.storage_url || photo.file_path}
                                alt={photo.caption || `Foto da atividade ${log.title}`}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Nenhuma foto anexada a este registro.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* ABA 2: ROTINA DOS PETS (PRESENÇA, ALIMENTAÇÃO, SONECA, ETC.)   */}
        {/* ============================================================= */}
        {activeMainTab === "pets" && (
          <div className="space-y-4">
            {/* Barra de Filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar pet..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-brand-blue shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {(["all", "present", "expected", "absent"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      statusFilter === st
                        ? "bg-ink text-white"
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
              <CardGridSkeleton label="Carregando rotina de hoje..." />
            ) : filteredPets.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
                <p className="text-sm font-semibold text-ink">Nenhum pet encontrado neste filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredPets.map((pet) => {
                  const att = attendanceByPet.get(pet.id);
                  const rep = reports[pet.id];
                  const isBusy = busyPetId === pet.id;
                  const isPresent = att?.status === "present";
                  const isEditingThis = activePetId === pet.id;

                  return (
                    <div
                      key={pet.id}
                      className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden flex flex-col justify-between ${
                        isEditingThis ? "border-brand-blue ring-2 ring-brand-blue/30" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Header Card */}
                      <div className="p-3.5 sm:p-4 border-b border-slate-100 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <PetAvatar pet={pet} size="md" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-base text-ink leading-tight">{pet.name}</h3>
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {pet.size}
                                </span>
                              </div>
                              <p className="text-xs text-ink-soft">{pet.breed || "SRD"} • {pet.approximate_age}</p>
                            </div>
                          </div>

                          <StatusBadge type="attendance" value={att?.status || "expected"} />
                        </div>

                        {/* Alertas de dieta e saúde */}
                        {(pet.diet_restrictions || pet.allergies) && (
                          <div className="bg-brand-pink/10 border border-brand-pink/30 rounded-lg p-2 text-xs text-ink space-y-1">
                            {pet.diet_restrictions && (
                              <div className="flex items-center gap-1.5 font-medium text-[11px]">
                                <Utensils className="w-3.5 h-3.5 text-brand-pink-ink shrink-0" />
                                <span className="truncate"><strong>Dieta:</strong> {pet.diet_restrictions}</span>
                              </div>
                            )}
                            {pet.allergies && (
                              <div className="flex items-center gap-1.5 font-medium text-[11px] text-rose-700">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="truncate"><strong>Alergia:</strong> {pet.allergies}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Controles Rápidos de Check-in e Check-out */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50 gap-2">
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <span>Entr: <strong>{att?.check_in_time ? formatTimeBR(att.check_in_time) : "-"}</strong></span>
                            <span>•</span>
                            <span>Saída: <strong>{att?.check_out_time ? formatTimeBR(att.check_out_time) : "-"}</strong></span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!isPresent ? (
                              <button
                                type="button"
                                onClick={() => handleQuickCheckIn(pet)}
                                disabled={isBusy}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                              >
                                {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />} Check-in
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickCheckOut(pet)}
                                disabled={isBusy || !!att?.check_out_time}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                              >
                                {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3 text-slate-400" />} {att?.check_out_time ? "Saiu" : "Check-out"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Resumo do Diário */}
                      <div className="p-3 bg-slate-50/60 flex-1 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-ink-soft font-medium text-[11px]">Status do Diário:</span>
                          <StatusBadge type="report" value={rep?.status || "draft"} />
                        </div>

                        {rep && (
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[11px] text-slate-600">
                            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">Alimentação</span>
                              <span className="font-semibold text-ink">
                                {rep.feeding === "comeu_tudo" ? "🥣 Tudo" : rep.feeding === "parcial" ? "🍲 Parcial" : rep.feeding === "nao_comeu" ? "❌ Não" : "Não inf."}
                              </span>
                            </div>
                            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">Soneca</span>
                              <span className="font-semibold text-ink">
                                {rep.nap_after_lunch === "sim" ? "😴 Sim" : rep.nap_after_lunch === "nao" ? "Ativo" : "Não inf."}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ações da Monitora */}
                      <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenReportEditor(pet)}
                          className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-bold bg-brand-blue/15 hover:bg-brand-blue/25 text-ink transition-colors cursor-pointer"
                        >
                          <FileEdit className="w-3.5 h-3.5 text-brand-blue-ink" />
                          <span>{rep ? "Editar" : "Preencher"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppShare(pet)}
                          disabled={!rep}
                          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 disabled:opacity-40 transition-colors cursor-pointer"
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
          </div>
        )}

        {/* ============================================================= */}
        {/* MODAL: CRIAR OU EDITAR REGISTRO DO DIA (MOBILE-FIRST)          */}
        {/* ============================================================= */}
        <Modal
          open={activityModalOpen}
          onClose={handleCloseActivityModal}
          locked={isSavingActivity}
          title={editingActivityId ? "Editar Registro do Dia" : "Novo Registro do Dia"}
          subtitle={<>{formatDateBR(todayDate)} • Até 10 fotos</>}
          icon={
            <div className="w-9 h-9 rounded-xl bg-brand-pink/15 text-brand-pink-ink flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
          }
        >
              {/* Formulário com scroll vertical confortável */}
              <form onSubmit={handleSaveActivity} className="p-4 sm:p-5 space-y-4">
                {/* Sugestões cadastradas no painel do administrador */}
                {activityTemplates.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">Sugestões Cadastradas:</label>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
                      {activityTemplates.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            setActivityTitle(tpl.title);
                            setActivityDescription(tpl.default_description);
                          }}
                          className={`text-[11px] px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                            activityTitle === tpl.title
                              ? "bg-brand-pink text-white border-brand-pink font-bold shadow-2xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Toque para preencher o título e a descrição automaticamente.
                    </p>
                  </div>
                )}

                {/* Título da Atividade */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink">
                    Título da Atividade: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Brincadeira da caça"
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-pink"
                  />
                </div>

                {/* Descrição da Atividade */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink">
                    Descrição da Atividade: <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Ex: Nossos baixinhos precisavam encontrar uma forma de tirar o petisco de dentro do brinquedo. Essa atividade desenvolve coordenação motora, faro e integração, além de ser muito divertida."
                    value={activityDescription}
                    onChange={(e) => setActivityDescription(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-pink leading-relaxed"
                  />
                </div>

                {/* Anexar Fotos (direto do celular, sem link web) */}
                <div className="border-t border-slate-100 pt-3">
                  <ActivityPhotoUploader
                    photos={activityPhotos}
                    onAddPhoto={handleAddPhotoToCurrentActivity}
                    onRemovePhoto={handleRemovePhotoFromCurrentActivity}
                    maxPhotos={10}
                  />
                </div>

                {/* Botões de Ação */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseActivityModal}
                    disabled={isSavingActivity}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingActivity}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-pink text-white hover:bg-brand-pink-dark shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingActivity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{isSavingActivity ? "Salvando..." : "Salvar Registro"}</span>
                  </button>
                </div>
              </form>
        </Modal>

        {/* ============================================================= */}
        {/* MODAL: DIÁRIO INDIVIDUAL DO PET                               */}
        {/* ============================================================= */}
        <Modal
          open={!!activePetId}
          onClose={() => setActivePetId(null)}
          locked={isSavingReport}
          title={<>Cuidados: {activePet?.name}</>}
          subtitle={<>{formatDateBR(todayDate)} • Por {monitorName}</>}
          icon={activePet ? <PetAvatar pet={activePet} size="sm" /> : undefined}
          footer={
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleSaveActiveReport("in_progress")}
                disabled={isSavingReport}
                className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Rascunho</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePetId(null)}
                  disabled={isSavingReport}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (await handleSaveActiveReport("completed")) setActivePetId(null);
                  }}
                  disabled={isSavingReport}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-pink-dark text-white hover:bg-brand-pink-ink shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSavingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Concluir</span>
                </button>
              </div>
            </div>
          }
        >
              {/* Formulário Operacional */}
              <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-xl p-2.5 flex items-start gap-2">
                  <Camera className="w-4 h-4 text-brand-blue-ink shrink-0 mt-0.5" />
                  <p className="text-[11px] text-ink">
                    As fotos das atividades ficam reunidas na aba <strong>&quot;Registros do Dia&quot;</strong>, disponíveis para todos os tutores baixarem até o encerramento do dia!
                  </p>
                </div>

                {/* Alimentação */}
                <div className="space-y-2 border border-slate-200 p-3 sm:p-4 rounded-xl bg-slate-50/50">
                  <label className="font-bold text-ink flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-brand-pink-ink" /> Alimentação
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { val: "comeu_tudo", label: "Comeu tudo" },
                      { val: "parcial", label: "Comeu parcial" },
                      { val: "nao_comeu", label: "Não comeu" },
                      { val: "nao_observado", label: "Não obs." },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setActiveReportDraft(prev => ({ ...prev, feeding: opt.val as FeedingStatus }))}
                        className={`p-2 rounded-lg border text-xs font-semibold text-center transition-colors cursor-pointer ${
                          activeReportDraft.feeding === opt.val
                            ? "bg-brand-blue text-white border-brand-blue"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Obs. da refeição (ex: Comeu toda ração às 12h)"
                    value={activeReportDraft.feeding_notes || ""}
                    onChange={(e) => setActiveReportDraft(prev => ({ ...prev, feeding_notes: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                {/* Atividades e Participação */}
                <div className="space-y-2 border border-slate-200 p-3 sm:p-4 rounded-xl bg-slate-50/50">
                  <label className="font-bold text-ink flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-brand-blue-ink" /> Participação nas Atividades
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                        className={`p-2 rounded-lg border text-xs font-semibold text-center transition-colors cursor-pointer ${
                          activeReportDraft.activities_participation === opt.val
                            ? "bg-brand-blue text-white border-brand-blue"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Detalhes (ex: Brincou bastante na piscina de bolinhas)"
                    value={activeReportDraft.activities_notes || ""}
                    onChange={(e) => setActiveReportDraft(prev => ({ ...prev, activities_notes: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                {/* Soneca */}
                <div className="space-y-2 border border-slate-200 p-3 sm:p-4 rounded-xl bg-slate-50/50">
                  <label className="font-bold text-ink flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-brand-pink-ink" /> Soneca Pós-Almoço
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { val: "sim", label: "Descansou 😴" },
                      { val: "nao", label: "Ficou acordado" },
                      { val: "nao_observado", label: "Não obs." },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setActiveReportDraft(prev => ({ ...prev, nap_after_lunch: opt.val as NapStatus }))}
                        className={`p-2 rounded-lg border text-xs font-semibold text-center transition-colors cursor-pointer ${
                          activeReportDraft.nap_after_lunch === opt.val
                            ? "bg-brand-blue text-white border-brand-blue"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comportamento e Socialização */}
                <div className="space-y-1">
                  <label className="font-bold text-ink">Comportamento & Socialização:</label>
                  <input
                    type="text"
                    placeholder="Ex: Muito alegre, interagiu bem com a matilha"
                    value={activeReportDraft.behavior_socialization || ""}
                    onChange={(e) => setActiveReportDraft(prev => ({ ...prev, behavior_socialization: e.target.value }))}
                    className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>

                {/* Observações Livres */}
                <div className="space-y-1">
                  <label className="font-bold text-ink">Recadinho para o Tutor:</label>
                  <textarea
                    rows={2}
                    placeholder="Informações adicionais para enviar no WhatsApp..."
                    value={activeReportDraft.free_observations || ""}
                    onChange={(e) => setActiveReportDraft(prev => ({ ...prev, free_observations: e.target.value }))}
                    className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
        </Modal>

        {/* Modal WhatsApp */}
        {petToShare && reports[petToShare.id] && (
          <WhatsAppShareModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            pet={petToShare}
            report={reports[petToShare.id]}
            guardians={petGuardians[petToShare.id] || []}
            onShareInitiated={() => markReportShared(petToShare)}
          />
        )}
      </main>
    </div>
  );
}
