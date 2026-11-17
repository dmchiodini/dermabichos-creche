"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getGuardianPortalPetsAndTodayReports } from "@/services/db-service";
import { getLoginMode, loginGuardian, logout } from "@/services/auth-actions";
import { ActionError, unwrap, errorMessage } from "@/lib/action-result";
import { DailyActivityLog, PortalData } from "@/types/database.types";
import { formatDateBR, formatTimeBR } from "@/lib/date-utils";
import { useTodayDate } from "@/lib/use-today";
import { slugify } from "@/lib/image-utils";
import { PetAvatar } from "@/components/PetAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { BrandLogo } from "@/components/BrandLogo";
import { useFeedback } from "@/components/ui/Feedback";
import {
  Clock,
  Utensils,
  Camera,
  ShieldCheck,
  LogOut,
  Heart,
  Calendar,
  Sparkles,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  RefreshCw
} from "lucide-react";

type LightboxState = {
  activity: DailyActivityLog;
  index: number; // 0-based
};

function photoUrl(photo: { storage_url?: string | null; file_path: string }): string {
  return photo.storage_url || photo.file_path;
}

function photoFileName(activityTitle: string, index: number): string {
  return `dermabichos-${slugify(activityTitle)}-${index + 1}.jpg`;
}

export default function PortalPage() {
  const { toast } = useFeedback();
  const [authState, setAuthState] = useState<"checking" | "anonymous" | "authenticated">("checking");
  const [phoneOrEmailInput, setPhoneOrEmailInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  const [portal, setPortal] = useState<PortalData | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const todayStr = useTodayDate();

  // Atividade selecionada para visualização expandida
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Lightbox para foto em tela cheia
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  // Download de fotos
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(null);
  const [isDownloadingActivity, setIsDownloadingActivity] = useState<string | null>(null);

  /** Carrega os dados do dia; retorna false se não houver sessão válida. */
  const loadPortal = useCallback(async (): Promise<boolean> => {
    try {
      const data = await unwrap(getGuardianPortalPetsAndTodayReports());
      setPortal(data);
      setSelectedPetId((current) =>
        current && data.pets.some((p) => p.id === current) ? current : data.pets[0]?.id || ""
      );
      setAuthState("authenticated");
      return true;
    } catch (err) {
      if (err instanceof ActionError && err.code === "AUTH") {
        setAuthState("anonymous");
        return false;
      }
      throw err;
    }
  }, []);

  const signIn = useCallback(
    async (identifier: string): Promise<string | null> => {
      const result = await loginGuardian(identifier);
      if (!result.ok) return result.error;
      setSelectedActivityId(null);
      await loadPortal();
      return null;
    },
    [loadPortal]
  );

  useEffect(() => {
    // Link vindo do WhatsApp: /portal?responsavel=11987654321 (aceita ?tutor= de links antigos)
    const params = new URLSearchParams(window.location.search);
    const urlTutor = params.get("responsavel") || params.get("tutor") || params.get("phone");
    if (urlTutor) {
      // Remove o telefone da barra de endereço/histórico do navegador.
      window.history.replaceState(null, "", window.location.pathname);
    }

    (async () => {
      try {
        // Os dados vêm primeiro (actions do Next rodam em fila); o modo demonstração
        // só importa para a tela de login.
        const hasSession = await loadPortal();
        if (!hasSession) getLoginMode().then((m) => setShowDemo(m.portalDemo)).catch(() => undefined);
        if (!hasSession && urlTutor) {
          setPhoneOrEmailInput(urlTutor);
          const failure = await signIn(urlTutor);
          if (failure) setAuthError(failure);
        }
      } catch (err) {
        setAuthState("anonymous");
        setAuthError(errorMessage(err, "Erro ao acessar o portal. Tente novamente."));
      }
    })();
  }, [loadPortal, signIn]);

  // Atualiza os registros quando o responsável volta para a aba/app (acompanhamento ao longo do dia).
  useEffect(() => {
    if (authState !== "authenticated") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") loadPortal().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [authState, loadPortal]);

  // Login sem senha: apenas telefone ou e-mail
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setAuthError("");
    setLoading(true);
    try {
      const failure = await signIn(phoneOrEmailInput);
      if (failure) setAuthError(failure);
    } catch (err) {
      setAuthError(errorMessage(err, "Erro ao acessar o portal. Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPortal();
      toast.success("Registros atualizados.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível atualizar."));
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout("guardian").catch(() => undefined);
    setAuthState("anonymous");
    setPortal(null);
    setSelectedPetId("");
    setSelectedActivityId(null);
    setLightbox(null);
    setPhoneOrEmailInput("");
  };

  const guardian = portal?.guardian;
  const pets = portal?.pets || [];
  const reports = portal?.reports || [];
  const activityLogs = portal?.activityLogs || [];

  // Pet ativo selecionado
  const activePet = pets.find(p => p.id === selectedPetId);
  const activeReport = reports.find(r => r.pet_id === selectedPetId);

  // Navegação do lightbox por teclado (Esc / ← / →)
  useEffect(() => {
    if (!lightbox) return;
    const total = lightbox.activity.photos.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((lb) => lb && { ...lb, index: (lb.index + 1) % total });
      if (e.key === "ArrowLeft") setLightbox((lb) => lb && { ...lb, index: (lb.index - 1 + total) % total });
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [lightbox]);

  // Download de foto individual
  const handleDownloadPhoto = async (url: string, fileName: string, photoId: string) => {
    const triggerDownload = (href: string) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    };

    try {
      setDownloadingPhotoId(photoId);
      if (url.startsWith("data:") || url.startsWith("blob:")) {
        triggerDownload(url);
        return;
      }

      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blobUrl = URL.createObjectURL(await response.blob());
      triggerDownload(blobUrl);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // Sem CORS: abre a foto em nova aba para o responsável salvar manualmente.
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingPhotoId(null);
    }
  };

  // Download de todas as fotos de uma atividade
  const handleDownloadAllPhotosOfActivity = async (activity: DailyActivityLog) => {
    if (!activity.photos || activity.photos.length === 0) return;
    setIsDownloadingActivity(activity.id);

    try {
      for (let i = 0; i < activity.photos.length; i++) {
        const p = activity.photos[i];
        const url = photoUrl(p);
        if (url) {
          await handleDownloadPhoto(url, photoFileName(activity.title, i), p.id || String(i));
          await new Promise((res) => setTimeout(res, 350));
        }
      }
    } finally {
      setIsDownloadingActivity(null);
    }
  };

  // -------------------------------------------------------------
  // VERIFICANDO SESSÃO
  // -------------------------------------------------------------
  if (authState === "checking") {
    return (
      <div className="min-h-dvh bg-linear-to-b from-brand-pink-light to-brand-blue-light flex flex-col justify-center items-center gap-3 p-4" role="status">
        <BrandLogo size="lg" />
        <p className="text-sm font-semibold text-ink-soft flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando o dia do seu pet...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TELA DE LOGIN DO PORTAL DO RESPONSÁVEL
  // -------------------------------------------------------------
  if (authState !== "authenticated" || !portal) {
    return (
      <div className="min-h-dvh bg-linear-to-b from-brand-pink-light to-brand-blue-light flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 animate-pop-in">
          <div className="text-center space-y-2">
            <BrandLogo size="lg" className="mx-auto" />
            <h1 className="text-2xl font-black text-ink tracking-tight">Portal do Responsável</h1>
            <p className="text-xs text-ink-soft">
              Acompanhamento diário da Creche Dermabichos
            </p>
          </div>

          <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-xl p-3 text-xs text-ink flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-brand-blue-ink shrink-0 mt-0.5" />
            <p>
              Acesso exclusivo para visualização dos registros de <strong>hoje ({formatDateBR(todayStr)})</strong> dos seus pets cadastrados e dos <strong>Registros do Dia</strong> da creche.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="portal-identifier" className="text-xs font-bold text-ink">Seu Telefone (WhatsApp) ou E-mail:</label>
              <input
                id="portal-identifier"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!authError}
                aria-describedby={authError ? "portal-error" : undefined}
                required
                value={phoneOrEmailInput}
                onChange={(e) => setPhoneOrEmailInput(e.target.value)}
                placeholder="Ex: (11) 98765-4321 ou seu@email.com"
                className="w-full text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-blue transition-colors shadow-2xs font-medium"
              />
              <p className="text-[11px] text-ink-soft">
                Acesso direto: basta informar o número ou e-mail cadastrado na creche.
              </p>
            </div>

            {authError && (
              <p id="portal-error" role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg font-medium">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-linear-to-r from-brand-pink-dark to-brand-pink-ink hover:opacity-95 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Acessando..." : "Acessar Portal"}
            </button>
          </form>

          {/* Dica para teste rápido de demonstração (somente fora de produção) */}
          {showDemo && (
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 mb-1.5 font-medium">Clique para testar com um responsável cadastrado:</p>
            <div className="flex flex-wrap justify-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setPhoneOrEmailInput("11987654321")}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Mariana (Thor)
              </button>
              <button
                type="button"
                onClick={() => setPhoneOrEmailInput("11991234567")}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Carlos (Pipoca)
              </button>
              <button
                type="button"
                onClick={() => setPhoneOrEmailInput("11976543210")}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Renata (Mel & Bob)
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ÁREA DO CLIENTE AUTENTICADO
  // -------------------------------------------------------------
  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      {/* Top Header do Portal */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" />
            <div>
              <h2 className="text-sm font-bold text-ink">Dermabichos Creche</h2>
              <p className="text-[11px] text-ink-soft">Olá, {guardian?.full_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Atualizar registros"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-4 py-5 space-y-6 flex-1">
        {/* Banner do Dia Atual */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-pink-ink" />
            <span className="text-xs font-bold text-ink">
              Acompanhamento de Hoje: {formatDateBR(todayStr)}
            </span>
          </div>
        </div>

        {/* Seletor de Cão se o responsável tiver mais de um */}
        {pets.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-ink-soft">Seus cães:</span>
            {pets.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPetId(p.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${selectedPetId === p.id
                  ? "bg-ink text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
              >
                <PetAvatar pet={p} size="sm" />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Card do Pet & Status de Presença */}
        {activePet && (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PetAvatar pet={activePet} size="lg" />
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-ink leading-tight">
                    {activePet.name}
                  </h1>
                  <p className="text-xs text-ink-soft">
                    {activePet.breed} • {activePet.approximate_age}
                  </p>
                </div>
              </div>

              <StatusBadge
                type="attendance"
                value={activeReport?.attendance?.status || "expected"}
              />
            </div>

            {/* Horários de Entrada e Saída */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Horário de Entrada</span>
                <span className="font-extrabold text-ink text-sm">
                  {activeReport?.attendance?.check_in_time
                    ? formatTimeBR(activeReport.attendance.check_in_time)
                    : "Ainda não chegou"}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Horário de Saída</span>
                <span className="font-extrabold text-ink text-sm">
                  {activeReport?.attendance?.check_out_time
                    ? formatTimeBR(activeReport.attendance.check_out_time)
                    : "Em estadia na creche"}
                </span>
              </div>
            </div>

            {/* Cuidados do Pet: Alimentação, Soneca, Socialização */}
            {activeReport && (
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-brand-pink-ink" /> Alimentação
                      </span>
                      <StatusBadge type="feeding" value={activeReport.feeding} />
                    </div>
                    <p className="text-slate-600 text-[11px] pt-1">
                      {activeReport.feeding_notes || "Refeição supervisionada pela equipe de cuidadores."}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-blue-ink" /> Soneca Pós-Almoço
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {activeReport.nap_after_lunch === "sim" ? "Descansou 😴" : activeReport.nap_after_lunch === "nao" ? "Ficou ativo" : "Não informado"}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] pt-1">
                      {activeReport.nap_notes || "Momento de calmaria e descanso em ambiente climatizado."}
                    </p>
                  </div>
                </div>

                {/* Socialização e Recadinho do Cuidador */}
                {(activeReport.behavior_socialization || activeReport.free_observations) && (
                  <div className="bg-brand-pink/5 border border-brand-pink/20 rounded-2xl p-3.5 space-y-2">
                    {activeReport.behavior_socialization && (
                      <div className="text-[11px] text-ink">
                        <strong>Socialização & Comportamento:</strong> {activeReport.behavior_socialization}
                      </div>
                    )}
                    {activeReport.free_observations && (
                      <div className="text-[11px] text-ink flex items-start gap-1.5 pt-1 border-t border-brand-pink/15">
                        <Heart className="w-3.5 h-3.5 text-brand-pink-ink shrink-0 mt-0.5" />
                        <div>
                          <strong>Recadinho do Cuidador:</strong> {activeReport.free_observations}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* SEÇÃO PRINCIPAL: REGISTROS DO DIA                             */}
        {/* ============================================================= */}
        <section className="space-y-3">
          {/* Top Header da Seção (Sem card dentro de card) */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-brand-pink to-brand-pink-dark text-white flex items-center justify-center shadow-xs shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-ink leading-tight">
                  Registros do Dia
                </h2>
                <p className="text-[11px] sm:text-xs text-ink-soft">
                  Atividades e fotos dos baixinhos hoje
                </p>
              </div>
            </div>

            <span className="text-xs font-bold bg-brand-pink/15 text-brand-pink-ink px-3 py-1 rounded-full shrink-0">
              {activityLogs.length} {activityLogs.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          {/* Aviso sobre a retenção até o final do dia */}
          <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Fotos disponíveis hoje:</strong> As fotos ficam salvas <strong>até o final do dia</strong>. Toque em qualquer atividade para abrir e baixar!
            </p>
          </div>

          {/* Lista Vertical de Registros do Dia (Sem card dentro de card, título 100% visível) */}
          {activityLogs.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 space-y-2 p-6">
              <Camera className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="font-bold text-sm text-ink">Nenhuma atividade postada ainda hoje</h4>
              <p className="text-xs text-ink-soft max-w-sm mx-auto">
                Nossa equipe de monitoras adiciona novos registros com fotos ao longo do dia. Volte em instantes para conferir!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activityLogs.map((activity) => {
                const isOpen = selectedActivityId === activity.id;
                const photoCount = activity.photos?.length || 0;

                return (
                  <div
                    key={activity.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isOpen
                      ? "bg-white border-brand-pink shadow-md ring-2 ring-brand-pink/15"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                      }`}
                  >
                    {/* Botão de Linha da Lista - Espaçoso, sem truncate, título completo */}
                    <button
                      type="button"
                      onClick={() => setSelectedActivityId(isOpen ? null : activity.id)}
                      className="w-full p-4 text-left transition-colors hover:bg-slate-50/80 cursor-pointer space-y-2"
                    >
                      {/* Topo do Card: Ícone + Título Completo + Botão de Ação */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isOpen
                              ? "bg-brand-pink text-white shadow-xs"
                              : "bg-brand-pink/15 text-brand-pink-ink"
                              }`}
                          >
                            <Camera className="w-4 h-4" />
                          </div>

                          {/* Título SEM truncate: visualização 100% completa */}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-sm sm:text-base text-ink leading-snug break-words">
                              {activity.title}
                            </h3>
                          </div>
                        </div>

                        {/* Indicador de abrir/fechar */}
                        <div className="shrink-0 pt-0.5">
                          <span
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${isOpen
                              ? "bg-brand-pink text-white shadow-2xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                          >
                            <span>{isOpen ? "Fechar" : "Ver registro"}</span>
                            {isOpen ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Metadados: Horário, Qtd de Fotos e Monitora (Linha própria com folga) */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-ink-soft pl-11.5">
                        <span className="font-bold text-ink bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {formatTimeBR(activity.created_at)}
                        </span>
                        <span className="font-bold text-brand-pink-ink bg-brand-pink/10 px-2 py-0.5 rounded-md">
                          {photoCount} {photoCount === 1 ? "foto" : "fotos"}
                        </span>
                        {activity.created_by_name && (
                          <span className="text-slate-500">
                            • {activity.created_by_name}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Informações detalhadas que abrem ao clicar */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4">
                        {/* Descrição pedagógica */}
                        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-pink-ink">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Sobre a Atividade:</span>
                          </div>
                          <p className="text-slate-700">{activity.description}</p>
                        </div>

                        {/* Top bar de fotos & Ação Baixar Todas */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                          <div>
                            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                              <Camera className="w-4 h-4 text-brand-pink-ink" />
                              <span>Fotos da Atividade ({photoCount} de 10)</span>
                            </span>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Toque na foto para ampliar em tela cheia ou baixe individualmente
                            </p>
                          </div>

                          {photoCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleDownloadAllPhotosOfActivity(activity)}
                              disabled={isDownloadingActivity === activity.id}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>
                                {isDownloadingActivity === activity.id
                                  ? "Baixando fotos..."
                                  : `Baixar Todas (${photoCount} fotos)`}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Grid de Fotos (Resistente ao mobile: 2 cols no celular, 3-4 em telas maiores) */}
                        {photoCount > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
                            {activity.photos!.map((photo, i) => (
                              <div
                                key={photo.id || i}
                                className="group relative rounded-2xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-2xs cursor-pointer"
                                role="button"
                                tabIndex={0}
                                aria-label={`Ampliar foto ${i + 1} de ${photoCount}`}
                                onClick={() => setLightbox({ activity, index: i })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setLightbox({ activity, index: i });
                                  }
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.storage_url || photo.file_path}
                                  alt={photo.caption || `Foto ${i + 1}`}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />

                                {/* Número da foto */}
                                <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                                  #{i + 1}
                                </span>

                                {/* Botão de Download Individual */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadPhoto(
                                      photoUrl(photo),
                                      photoFileName(activity.title, i),
                                      photo.id || String(i)
                                    );
                                  }}
                                  disabled={downloadingPhotoId === (photo.id || String(i))}
                                  className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white px-2 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1.5 text-[11px] font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 z-10 cursor-pointer"
                                  aria-label={`Baixar foto ${i + 1}`}
                                >
                                  <Download className="w-3 h-3 text-brand-blue-ink" />
                                  <span>
                                    {downloadingPhotoId === (photo.id || String(i)) ? "..." : "Baixar"}
                                  </span>
                                </button>

                                {photo.caption && (
                                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-2 text-white text-[10px] truncate">
                                    {photo.caption}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Nenhuma foto anexada a este registro.
                          </div>
                        )}

                        {/* Botão para recolher ao fim do card */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedActivityId(null)}
                            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ChevronUp className="w-4 h-4" />
                            <span>Recolher informações</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Lightbox de Foto em Tela Cheia (Esc fecha, ← → navegam) */}
      {lightbox && (() => {
        const photos = lightbox.activity.photos;
        const photo = photos[lightbox.index];
        if (!photo) return null;
        const go = (delta: number) =>
          setLightbox({ ...lightbox, index: (lightbox.index + delta + photos.length) % photos.length });
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${lightbox.activity.title} — foto ${lightbox.index + 1} de ${photos.length}`}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in"
            onClick={() => setLightbox(null)}
          >
            <div className="relative max-w-4xl w-full max-h-[94dvh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-full flex items-center justify-between gap-3 text-white pb-3 px-1">
                <div className="min-w-0">
                  <h4 className="font-bold text-sm sm:text-base truncate">{lightbox.activity.title}</h4>
                  <p className="text-xs text-slate-300">
                    Foto {lightbox.index + 1} de {photos.length}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadPhoto(photoUrl(photo), photoFileName(lightbox.activity.title, lightbox.index), photo.id)}
                    disabled={downloadingPhotoId === photo.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-blue-ink hover:bg-brand-blue-dark text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                  >
                    {downloadingPhotoId === photo.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Baixar Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightbox(null)}
                    aria-label="Fechar"
                    autoFocus
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={photo.id}
                  src={photoUrl(photo)}
                  alt={photo.caption || "Foto da creche"}
                  className="max-h-[74dvh] w-auto object-contain animate-fade-in"
                />

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      aria-label="Foto anterior"
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      aria-label="Próxima foto"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {photo.caption && (
                <p className="text-xs sm:text-sm text-slate-200 text-center mt-3 bg-black/50 px-4 py-2 rounded-xl">
                  {photo.caption}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Footer do Portal */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[11px] text-ink-soft">
        Dermabichos Creche dos Baixinhos • Cuidando com amor e respeito à matilha.
      </footer>
    </div>
  );
}
