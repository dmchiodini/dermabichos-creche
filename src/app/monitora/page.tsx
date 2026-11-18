"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatTimeBR } from "@/lib/date-utils";
import { useTodayDate } from "@/lib/use-today";
import {
  getMonitoraData,
  updateAttendance,
  saveDailyReport,
  saveDailyActivityLog,
  deleteDailyActivityLog,
  addDailyActivityPhoto,
  removeDailyActivityPhoto,
} from "@/services/db-service";
import { logout } from "@/services/auth-actions";
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
import { SiteFooter } from "@/components/SiteFooter";
import { StatusBadge } from "@/components/StatusBadge";
import { BrandLogo } from "@/components/BrandLogo";
import { ActivityPhotoUploader } from "@/components/ActivityPhotoUploader";
import { WhatsAppShareModal } from "@/components/WhatsAppShareModal";
import { Modal } from "@/components/ui/Modal";
import { CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
import { SearchField, EmptyState } from "@/components/ui/Page";
import {
  Dog,
  LogIn,
  LogOut,
  FileEdit,
  Share2,
  Check,
  Save,
  Utensils,
  Flame,
  ShieldAlert,
  Camera,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  Moon
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

  // Inicialização: sessão vem do servidor (cookie HTTP-only), não do localStorage.
  // O nome de quem está logado chega junto com os dados, na mesma requisição.
  useEffect(() => {
    async function loadTodayData() {
      if (!todayDate) return;
      try {
        // Uma única ida ao servidor: as 6 consultas rodam em paralelo lá
        // (Server Actions chamadas do navegador são enfileiradas pelo Next.js).
        const {
          viewerName,
          pets: allPets,
          attendance: attList,
          reports: dayReports,
          guardiansByPet: guardMap,
          activityLogs: logs,
          templates: tpls,
        } = await unwrap(getMonitoraData(todayDate));
        setMonitorName(viewerName || "Equipe");

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
        setMonitorName(prev => prev || "Equipe");
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

      toast.success(editingActivityId ? "Registro atualizado!" : "Registro publicado para os responsáveis!");
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
      message: <>O registro <strong>{log.title}</strong> e suas {log.photos?.length || 0} foto(s) serão removidos do portal dos responsáveis.</>,
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
  const longDate = todayDate
    ? new Date(`${todayDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div className="min-h-dvh flex flex-col pb-10">
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-sm border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="sm" />
            <div className="leading-tight min-w-0">
              <p className="font-display font-extrabold text-ink truncate">
                {monitorName ? monitorName : <Skeleton className="h-4 w-24" />}
              </p>
              <p className="text-xs text-ink-soft first-letter:uppercase">{longDate}</p>
            </div>
          </div>

          <button type="button" onClick={handleLogout} disabled={loggingOut} className="btn btn-sm btn-ghost">
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6 flex-1">
        {/* Fechamento do dia: um painel, quatro números */}
        <dl className="panel bg-line! overflow-hidden grid grid-cols-2 sm:grid-cols-4 gap-px">
          <Stat label="Presentes" value={presentCount} of={totalPets} />
          <Stat label="Registros publicados" value={activityLogs.length} />
          <Stat label="Diários concluídos" value={completedReportsCount} of={presentCount} />
          <Stat label="Enviados no WhatsApp" value={sharedReportsCount} of={presentCount} />
        </dl>

        {/* Abas */}
        <div role="tablist" aria-label="Seções do plantão" className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white border border-line">
          {([
            ["activities", "Registros do dia", Camera, activityLogs.length],
            ["pets", "Rotina dos baixinhos", Dog, pets.length],
          ] as const).map(([key, label, Icon, count]) => {
            const selected = activeMainTab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveMainTab(key)}
                className={`flex items-center justify-center gap-2 min-h-11 px-2 rounded-xl text-sm font-extrabold transition-colors cursor-pointer ${
                  selected ? (key === "activities" ? "bg-brand-pink text-ink" : "bg-brand-blue text-ink") : "text-ink-soft hover:text-ink hover:bg-paper"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
                <span className={`text-xs tabular px-1.5 rounded-full ${selected ? "bg-white/60" : "bg-paper"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ============================================================= */}
        {/* ABA 1: REGISTROS DO DIA (GERAL / ATIVIDADES / ATÉ 10 FOTOS)   */}
        {/* ============================================================= */}
        {activeMainTab === "activities" && (
          <section aria-labelledby="activities-title" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 id="activities-title" className="text-2xl font-extrabold text-ink">Registros do dia</h2>
                <p className="text-sm text-ink-soft mt-0.5">
                  Fotos e descrição das atividades. Os responsáveis veem e baixam até o fim do dia.
                </p>
              </div>
              <button type="button" onClick={handleOpenNewActivity} className="btn btn-primary w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                Novo registro
              </button>
            </div>

            {loading ? (
              <div className="space-y-4" role="status" aria-label="Carregando atividades de hoje">
                {[0, 1].map(i => (
                  <div key={i} className="panel p-5 space-y-3">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-16 w-full" />
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {[0, 1, 2].map(j => <Skeleton key={j} className="aspect-square" />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : activityLogs.length === 0 ? (
              <EmptyState
                icon={<Camera className="w-6 h-6" />}
                title="Nenhum registro publicado hoje"
                action={
                  <button type="button" onClick={handleOpenNewActivity} className="btn btn-primary">
                    <Plus className="w-4 h-4" />
                    Publicar o primeiro registro
                  </button>
                }
              >
                Escolha uma atividade, tire as fotos e publique. Os responsáveis recebem no portal na hora.
              </EmptyState>
            ) : (
              <ul className="space-y-4">
                {activityLogs.map((log) => (
                  <li key={log.id} className="panel p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-brand-pink-ink tabular">
                          {formatTimeBR(log.created_at)}
                        </p>
                        <h3 className="text-lg sm:text-xl font-bold text-ink leading-tight">{log.title}</h3>
                      </div>
                      <div className="flex items-center shrink-0 -mr-1.5 -mt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditActivity(log)}
                          aria-label={`Editar ${log.title}`}
                          title="Editar"
                          className="icon-btn"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(log)}
                          aria-label={`Excluir ${log.title}`}
                          title="Excluir"
                          className="icon-btn hover:text-rose-700! hover:bg-rose-50!"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap max-w-prose">{log.description}</p>

                    {log.photos && log.photos.length > 0 ? (
                      <ul className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {log.photos.map((photo, i) => (
                          <li key={photo.id || i} className="rounded-xl overflow-hidden aspect-square bg-brand-blue-light">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.storage_url || photo.file_path}
                              alt={photo.caption || `Foto da atividade ${log.title}`}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-ink-soft">Sem fotos. Toque em editar para adicionar.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ============================================================= */}
        {/* ABA 2: ROTINA DOS PETS (PRESENÇA, ALIMENTAÇÃO, SONECA, ETC.)   */}
        {/* ============================================================= */}
        {activeMainTab === "pets" && (
          <section aria-label="Rotina dos baixinhos" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <SearchField value={searchFilter} onChange={setSearchFilter} placeholder="Buscar baixinho" label="Buscar baixinho" />

              <div role="group" aria-label="Filtrar por presença" className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {([
                  ["all", "Todos"],
                  ["present", "Presentes"],
                  ["expected", "Esperados"],
                  ["absent", "Faltas"],
                ] as const).map(([st, label]) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    aria-pressed={statusFilter === st}
                    className="choice shrink-0 rounded-full! px-4!"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <CardGridSkeleton label="Carregando rotina de hoje..." />
            ) : filteredPets.length === 0 ? (
              <EmptyState icon={<Dog className="w-6 h-6" />} title="Nenhum baixinho neste filtro">
                Troque o filtro ou limpe a busca para ver todos.
              </EmptyState>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPets.map((pet) => {
                  const att = attendanceByPet.get(pet.id);
                  const rep = reports[pet.id];
                  const isBusy = busyPetId === pet.id;
                  const isPresent = att?.status === "present";
                  const isEditingThis = activePetId === pet.id;

                  return (
                    <li
                      key={pet.id}
                      className={`panel flex flex-col overflow-hidden ${isEditingThis ? "border-brand-blue-ink! ring-2 ring-brand-blue" : ""}`}
                    >
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <PetAvatar pet={pet} size="md" />
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-ink leading-tight truncate">{pet.name}</h3>
                              <p className="text-sm text-ink-soft truncate">
                                {[pet.breed || "SRD", pet.approximate_age].filter(Boolean).join(", ")}
                              </p>
                            </div>
                          </div>
                          <StatusBadge type="attendance" value={att?.status || "expected"} />
                        </div>

                        {/* Alertas de dieta e saúde: o que a monitora não pode esquecer */}
                        {(pet.diet_restrictions || pet.allergies) && (
                          <div className="space-y-1.5 text-sm">
                            {pet.diet_restrictions && (
                              <p className="flex items-start gap-2 rounded-xl bg-brand-pink-light px-3 py-2 text-ink">
                                <Utensils className="w-4 h-4 text-brand-pink-ink shrink-0 mt-0.5" />
                                <span><strong>Dieta:</strong> {pet.diet_restrictions}</span>
                              </p>
                            )}
                            {pet.allergies && (
                              <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-900">
                                <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                                <span><strong>Cuidados:</strong> {pet.allergies}</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Chegada e saída */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <dl className="flex gap-5 text-sm">
                            <div>
                              <dt className="text-xs text-ink-soft">Chegada</dt>
                              <dd className="font-display font-bold text-ink tabular">
                                {att?.check_in_time ? formatTimeBR(att.check_in_time) : "–"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-ink-soft">Saída</dt>
                              <dd className="font-display font-bold text-ink tabular">
                                {att?.check_out_time ? formatTimeBR(att.check_out_time) : "–"}
                              </dd>
                            </div>
                          </dl>

                          {!isPresent ? (
                            <button
                              type="button"
                              onClick={() => handleQuickCheckIn(pet)}
                              disabled={isBusy}
                              className="btn btn-sm btn-blue"
                            >
                              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                              Check-in
                            </button>
                          ) : att?.check_out_time ? (
                            <span className="text-sm font-bold text-ink-soft">Já saiu</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickCheckOut(pet)}
                              disabled={isBusy}
                              className="btn btn-sm btn-secondary"
                            >
                              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                              Check-out
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Diário */}
                      <div className="mt-auto px-4 sm:px-5 py-3.5 bg-paper border-t border-line space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-ink">Diário</span>
                          <StatusBadge type="report" value={rep?.status || "draft"} />
                        </div>

                        {rep && (
                          <div className="flex flex-wrap gap-1.5">
                            <StatusBadge type="feeding" value={rep.feeding} />
                            <StatusBadge type="nap" value={rep.nap_after_lunch} />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenReportEditor(pet)}
                            className="btn btn-sm btn-secondary flex-1"
                          >
                            <FileEdit className="w-4 h-4 text-brand-blue-ink" />
                            {rep ? "Editar diário" : "Preencher diário"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsAppShare(pet)}
                            disabled={!rep}
                            className="btn btn-sm btn-secondary text-emerald-800!"
                            title={rep ? "Enviar resumo pelo WhatsApp" : "Preencha o diário antes de enviar"}
                          >
                            <Share2 className="w-4 h-4" />
                            WhatsApp
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* ============================================================= */}
        {/* MODAL: CRIAR OU EDITAR REGISTRO DO DIA (MOBILE-FIRST)          */}
        {/* ============================================================= */}
        <Modal
          open={activityModalOpen}
          onClose={handleCloseActivityModal}
          locked={isSavingActivity}
          title={editingActivityId ? "Editar registro" : "Novo registro do dia"}
          subtitle="Até 10 fotos. Os responsáveis veem no portal."
          icon={
            <div className="w-10 h-10 rounded-xl bg-brand-pink-light text-brand-pink-ink flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
          }
        >
          <form onSubmit={handleSaveActivity} className="px-4 sm:px-6 py-5 space-y-5">
            {/* Sugestões cadastradas no painel do administrador */}
            {activityTemplates.length > 0 && (
              <div>
                <span id="tpl-label" className="field-label">Escolha uma atividade</span>
                <div role="group" aria-labelledby="tpl-label" className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                  {activityTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      aria-pressed={activityTitle === tpl.title}
                      onClick={() => {
                        setActivityTitle(tpl.title);
                        setActivityDescription(tpl.default_description);
                      }}
                      className="choice shrink-0 rounded-full!"
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
                <p className="field-hint">Preenche o título e a descrição. Você pode ajustar o texto depois.</p>
              </div>
            )}

            <div>
              <label htmlFor="activity-title" className="field-label">Título</label>
              <input
                id="activity-title"
                type="text"
                required
                placeholder="Ex.: Brincadeira da caça"
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="activity-description" className="field-label">Como foi</label>
              <textarea
                id="activity-description"
                rows={4}
                required
                placeholder="Ex.: Os baixinhos precisavam tirar o petisco de dentro do brinquedo. Trabalha faro, coordenação e integração."
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                className="field leading-relaxed"
              />
            </div>

            <div className="border-t border-line pt-5">
              <ActivityPhotoUploader
                photos={activityPhotos}
                onAddPhoto={handleAddPhotoToCurrentActivity}
                onRemovePhoto={handleRemovePhotoFromCurrentActivity}
                maxPhotos={10}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-5 border-t border-line">
              <button type="button" onClick={handleCloseActivityModal} disabled={isSavingActivity} className="btn btn-ghost">
                Cancelar
              </button>
              <button type="submit" disabled={isSavingActivity} className="btn btn-primary flex-1 sm:flex-initial">
                {isSavingActivity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isSavingActivity ? "Publicando..." : editingActivityId ? "Salvar alterações" : "Publicar registro"}
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
          title={<>Diário {activePet?.gender === "femea" ? "da" : "do"} {activePet?.name}</>}
          subtitle={<>Hoje, por {monitorName}</>}
          icon={activePet ? <PetAvatar pet={activePet} size="sm" /> : undefined}
          footer={
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleSaveActiveReport("in_progress")}
                disabled={isSavingReport}
                className="btn btn-secondary"
              >
                <Save className="w-4 h-4" />
                Salvar rascunho
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (await handleSaveActiveReport("completed")) setActivePetId(null);
                }}
                disabled={isSavingReport}
                className="btn btn-primary"
              >
                {isSavingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Concluir diário
              </button>
            </div>
          }
        >
          <div className="px-4 sm:px-6 py-5 space-y-6 text-sm">
            <ChoiceGroup
              icon={<Utensils className="w-4 h-4 text-brand-pink-ink" />}
              label="Alimentação"
              columns="grid-cols-2 sm:grid-cols-4"
              value={activeReportDraft.feeding}
              options={[
                { val: "comeu_tudo", label: "Comeu tudo" },
                { val: "parcial", label: "Comeu parte" },
                { val: "nao_comeu", label: "Não comeu" },
                { val: "nao_observado", label: "Não vi" },
              ]}
              onChange={(v) => setActiveReportDraft(prev => ({ ...prev, feeding: v as FeedingStatus }))}
            >
              <input
                type="text"
                aria-label="Observação da refeição"
                placeholder="Observação (ex.: comeu toda a ração às 12h)"
                value={activeReportDraft.feeding_notes || ""}
                onChange={(e) => setActiveReportDraft(prev => ({ ...prev, feeding_notes: e.target.value }))}
                className="field"
              />
            </ChoiceGroup>

            <ChoiceGroup
              icon={<Flame className="w-4 h-4 text-brand-pink-ink" />}
              label="Atividades"
              columns="grid-cols-2 sm:grid-cols-4"
              value={activeReportDraft.activities_participation}
              options={[
                { val: "participou", label: "Participou" },
                { val: "parcial", label: "Em parte" },
                { val: "nao_participou", label: "Não quis" },
                { val: "nao_observado", label: "Livre" },
              ]}
              onChange={(v) => setActiveReportDraft(prev => ({ ...prev, activities_participation: v as ActivityParticipation }))}
            >
              <input
                type="text"
                aria-label="Detalhes das atividades"
                placeholder="Detalhes (ex.: brincou bastante na piscina de bolinhas)"
                value={activeReportDraft.activities_notes || ""}
                onChange={(e) => setActiveReportDraft(prev => ({ ...prev, activities_notes: e.target.value }))}
                className="field"
              />
            </ChoiceGroup>

            <ChoiceGroup
              icon={<Moon className="w-4 h-4 text-brand-pink-ink" />}
              label="Soneca depois do almoço"
              columns="grid-cols-3"
              value={activeReportDraft.nap_after_lunch}
              options={[
                { val: "sim", label: "Descansou" },
                { val: "nao", label: "Ficou ativo" },
                { val: "nao_observado", label: "Não vi" },
              ]}
              onChange={(v) => setActiveReportDraft(prev => ({ ...prev, nap_after_lunch: v as NapStatus }))}
            />

            <div>
              <label htmlFor="report-behavior" className="field-label">Comportamento</label>
              <input
                id="report-behavior"
                type="text"
                placeholder="Ex.: Muito alegre, brincou bem com a turma"
                value={activeReportDraft.behavior_socialization || ""}
                onChange={(e) => setActiveReportDraft(prev => ({ ...prev, behavior_socialization: e.target.value }))}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="report-note" className="field-label">Recado para o responsável</label>
              <textarea
                id="report-note"
                rows={3}
                placeholder="Aparece em destaque no portal e vai junto no WhatsApp."
                value={activeReportDraft.free_observations || ""}
                onChange={(e) => setActiveReportDraft(prev => ({ ...prev, free_observations: e.target.value }))}
                className="field"
              />
            </div>

            <p className="text-xs text-ink-soft">
              As fotos ficam na aba Registros do dia, junto com a atividade.
            </p>
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

      <SiteFooter className="max-w-7xl mx-auto w-full sm:px-6 lg:px-8 pb-0" />
    </div>
  );
}

/** Número do fechamento do dia (ex.: 8 de 12). */
function Stat({ label, value, of }: { label: string; value: number; of?: number }) {
  return (
    <div className="bg-white p-4 sm:p-5">
      <dt className="text-sm text-ink-soft leading-tight">{label}</dt>
      <dd className="mt-1 font-display font-extrabold text-ink tabular leading-none">
        <span className="text-3xl sm:text-4xl">{value}</span>
        {of !== undefined && <span className="text-base text-ink-soft"> de {of}</span>}
      </dd>
    </div>
  );
}

/** Grupo de opções de toque único (alimentação, atividades, soneca). */
function ChoiceGroup({
  icon,
  label,
  columns,
  value,
  options,
  onChange,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  columns: string;
  value: string | undefined;
  options: { val: string; label: string }[];
  onChange: (value: string) => void;
  children?: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="space-y-2.5">
      <span id={id} className="field-label mb-0! flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className={`grid gap-1.5 ${columns}`}>
        {options.map((opt) => (
          <button
            key={opt.val}
            type="button"
            role="radio"
            aria-checked={value === opt.val}
            onClick={() => onChange(opt.val)}
            className="choice"
          >
            {opt.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
