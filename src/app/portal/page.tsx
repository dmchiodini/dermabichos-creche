"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getGuardianPortalPetsAndTodayReports } from "@/services/db-service";
import { getLoginMode, loginGuardian, logout } from "@/services/auth-actions";
import { ActionError, unwrap, errorMessage } from "@/lib/action-result";
import { DailyActivityLog, PortalData } from "@/types/database.types";
import { formatTimeBR } from "@/lib/date-utils";
import { useTodayDate } from "@/lib/use-today";
import { slugify } from "@/lib/image-utils";
import { AuthShell, AuthBrand } from "@/components/auth/AuthShell";
import { PetAvatar } from "@/components/PetAvatar";
import { SiteFooter } from "@/components/SiteFooter";
import { StatusBadge } from "@/components/StatusBadge";
import { BrandLogo } from "@/components/BrandLogo";
import { useFeedback } from "@/components/ui/Feedback";
import {
  Utensils,
  Camera,
  LogIn,
  LogOut,
  Heart,
  Moon,
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  RefreshCw,
  Smartphone,
} from "lucide-react";

type LightboxState = {
  activity: DailyActivityLog;
  index: number; // 0-based
};

function photoUrl(photo: {
  storage_url?: string | null;
  file_path: string;
}): string {
  return photo.storage_url || photo.file_path;
}

function photoFileName(activityTitle: string, index: number): string {
  return `dermabichos-${slugify(activityTitle)}-${index + 1}.jpg`;
}

export default function PortalPage() {
  const { toast } = useFeedback();
  const [authState, setAuthState] = useState<
    "checking" | "anonymous" | "authenticated"
  >("checking");
  const [phoneOrEmailInput, setPhoneOrEmailInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  const [portal, setPortal] = useState<PortalData | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const todayStr = useTodayDate();

  // Lightbox para foto em tela cheia
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  // Download de fotos
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(
    null,
  );
  const [isDownloadingActivity, setIsDownloadingActivity] = useState<
    string | null
  >(null);

  /** Carrega os dados do dia; retorna false se não houver sessão válida. */
  const loadPortal = useCallback(async (): Promise<boolean> => {
    try {
      const data = await unwrap(getGuardianPortalPetsAndTodayReports());
      setPortal(data);
      setSelectedPetId((current) =>
        current && data.pets.some((p) => p.id === current)
          ? current
          : data.pets[0]?.id || "",
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
      await loadPortal();
      return null;
    },
    [loadPortal],
  );

  useEffect(() => {
    // Link vindo do WhatsApp: /portal?responsavel=11987654321 (aceita ?tutor= de links antigos)
    const params = new URLSearchParams(window.location.search);
    const urlTutor =
      params.get("responsavel") || params.get("tutor") || params.get("phone");
    if (urlTutor) {
      // Remove o telefone da barra de endereço/histórico do navegador.
      // Mantém o estado interno do roteador do Next (window.history.state): com `null`,
      // o Next trata a troca como navegação e enfileira à frente das Server Actions,
      // e a tela ficava presa em "Carregando" ao abrir o link do WhatsApp.
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }

    (async () => {
      try {
        // Os dados vêm primeiro (actions do Next rodam em fila); o modo demonstração
        // só importa para a tela de login.
        const hasSession = await loadPortal();
        if (!hasSession)
          getLoginMode()
            .then((m) => setShowDemo(m.portalDemo))
            .catch(() => undefined);
        if (!hasSession && urlTutor) {
          setPhoneOrEmailInput(urlTutor);
          const failure = await signIn(urlTutor);
          if (failure) setAuthError(failure);
        }
      } catch (err) {
        setAuthState("anonymous");
        setAuthError(
          errorMessage(err, "Erro ao acessar o portal. Tente novamente."),
        );
      }
    })();
  }, [loadPortal, signIn]);

  // Atualiza os registros quando o responsável volta para a aba/app (acompanhamento ao longo do dia).
  useEffect(() => {
    if (authState !== "authenticated") return;
    const onVisible = () => {
      if (document.visibilityState === "visible")
        loadPortal().catch(() => undefined);
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
      setAuthError(
        errorMessage(err, "Erro ao acessar o portal. Tente novamente."),
      );
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
    setLightbox(null);
    setPhoneOrEmailInput("");
  };

  const guardian = portal?.guardian;
  const pets = portal?.pets || [];
  const reports = portal?.reports || [];
  const activityLogs = portal?.activityLogs || [];

  // Pet ativo selecionado
  const activePet = pets.find((p) => p.id === selectedPetId);
  const activeReport = reports.find((r) => r.pet_id === selectedPetId);

  // Navegação do lightbox por teclado (Esc / ← / →)
  useEffect(() => {
    if (!lightbox) return;
    const total = lightbox.activity.photos.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight")
        setLightbox((lb) => lb && { ...lb, index: (lb.index + 1) % total });
      if (e.key === "ArrowLeft")
        setLightbox(
          (lb) => lb && { ...lb, index: (lb.index - 1 + total) % total },
        );
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
  const handleDownloadPhoto = async (
    url: string,
    fileName: string,
    photoId: string,
  ) => {
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
  const handleDownloadAllPhotosOfActivity = async (
    activity: DailyActivityLog,
  ) => {
    if (!activity.photos || activity.photos.length === 0) return;
    setIsDownloadingActivity(activity.id);

    try {
      for (let i = 0; i < activity.photos.length; i++) {
        const p = activity.photos[i];
        const url = photoUrl(p);
        if (url) {
          await handleDownloadPhoto(
            url,
            photoFileName(activity.title, i),
            p.id || String(i),
          );
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
      <div
        className="min-h-dvh flex flex-col justify-center items-center gap-4 p-4"
        role="status"
      >
        <BrandLogo size="lg" />
        <p className="text-sm font-semibold text-ink-soft flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando o dia do seu
          baixinho...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TELA DE LOGIN DO PORTAL DO RESPONSÁVEL
  // -------------------------------------------------------------
  if (authState !== "authenticated" || !portal) {
    return (
      <AuthShell>
        <AuthBrand caption="Creche dos Baixinhos" />

        <h1 className="mt-6 text-center text-[1.75rem] sm:text-3xl font-extrabold text-ink leading-tight">
          Acompanhe o dia do seu baixinho
        </h1>
        <p className="mt-2 text-center text-sm text-ink-soft">
          Chegada, alimentação, soneca e as fotos de hoje.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label htmlFor="portal-identifier" className="field-label">
              WhatsApp ou e-mail cadastrado
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="portal-identifier"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!authError}
                aria-describedby={authError ? "portal-error" : "portal-hint"}
                required
                value={phoneOrEmailInput}
                onChange={(e) => setPhoneOrEmailInput(e.target.value)}
                placeholder="(11) 98765-4321"
                className="field pl-11! py-3.5! text-base!"
              />
            </div>
            <p id="portal-hint" className="field-hint">
              O mesmo número ou e-mail que você deu na creche. Não precisa de
              senha.
            </p>
          </div>

          {authError && (
            <p
              id="portal-error"
              role="alert"
              className="text-sm text-rose-800 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl font-semibold"
            >
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-lg btn-primary w-full"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Atalhos de teste (somente fora de produção) */}
        {showDemo && (
          <div className="mt-6 pt-5 border-t border-line">
            <p className="text-xs text-ink-soft text-center mb-2.5">
              Modo demonstração: escolha um responsável
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {[
                ["11987654321", "Mariana (Thor)"],
                ["11991234567", "Carlos (Pipoca)"],
                ["11976543210", "Renata (Mel e Bob)"],
              ].map(([phone, label]) => (
                <button
                  key={phone}
                  type="button"
                  onClick={() => setPhoneOrEmailInput(phone)}
                  className="btn btn-sm btn-secondary rounded-full!"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </AuthShell>
    );
  }

  // -------------------------------------------------------------
  // ÁREA DO CLIENTE AUTENTICADO
  // -------------------------------------------------------------
  const attendance = activeReport?.attendance;
  const firstName = guardian?.full_name?.split(" ")[0] || "";
  const longDate = todayStr
    ? new Date(`${todayStr}T12:00:00`).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";
  const timelineLogs = [...activityLogs].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  // Ordem cronológica real: registros antes da chegada, durante a estadia e depois da saída.
  const checkIn = attendance?.check_in_time ? Date.parse(attendance.check_in_time) : null;
  const checkOut = attendance?.check_out_time ? Date.parse(attendance.check_out_time) : null;
  const logsBefore = checkIn ? timelineLogs.filter((l) => Date.parse(l.created_at) < checkIn) : [];
  const logsAfter = checkOut ? timelineLogs.filter((l) => Date.parse(l.created_at) > checkOut) : [];
  const logsDuring = timelineLogs.filter((l) => !logsBefore.includes(l) && !logsAfter.includes(l));

  /** Um registro do dia na linha do tempo (fotos com ampliação e download). */
  const renderActivity = (activity: DailyActivityLog, last = false) => {
                const photoCount = activity.photos?.length || 0;
                return (
                  <TimelineItem
                    key={activity.id}
                    last={last}
                    tone="pink"
                    icon={<Camera className="w-4 h-4" />}
                    time={formatTimeBR(activity.created_at)}
                    title={activity.title}
                  >
                    {activity.description && (
                      <p className="mt-1.5 text-sm sm:text-[15px] text-ink-soft leading-relaxed whitespace-pre-wrap max-w-prose">
                        {activity.description}
                      </p>
                    )}

                    {photoCount > 0 && (
                      <>
                        <ul className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {activity.photos!.map((photo, i) => (
                            <li key={photo.id || i}>
                              <button
                                type="button"
                                onClick={() =>
                                  setLightbox({ activity, index: i })
                                }
                                aria-label={`Ampliar foto ${i + 1} de ${photoCount}: ${activity.title}`}
                                className="group block w-full aspect-square rounded-xl overflow-hidden bg-brand-blue-light cursor-zoom-in"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photoUrl(photo)}
                                  alt={photo.caption || `Foto ${i + 1}`}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover text-transparent transition-transform duration-300 group-hover:scale-[1.04]"
                                />
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadAllPhotosOfActivity(activity)
                          }
                          disabled={isDownloadingActivity === activity.id}
                          className="btn btn-sm btn-secondary mt-3"
                        >
                          {isDownloadingActivity === activity.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          {isDownloadingActivity === activity.id
                            ? "Baixando..."
                            : photoCount === 1
                              ? "Baixar foto"
                              : `Baixar as ${photoCount} fotos`}
                        </button>
                      </>
                    )}
                  </TimelineItem>
                );
  };

  const hasCareNotes =
    !!activeReport &&
    (activeReport.feeding !== "nao_observado" ||
      activeReport.nap_after_lunch !== "nao_observado" ||
      !!activeReport.behavior_socialization ||
      !!activeReport.free_observations);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-sm border-b border-line">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="sm" />
            <p className="text-sm text-ink-soft truncate">
              Olá, <span className="font-bold text-ink">{firstName}</span>
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Atualizar"
              title="Atualizar"
              className="icon-btn"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-sm btn-ghost"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 py-6 sm:py-10 flex-1">
        {/* Seletor de cão quando o responsável tem mais de um */}
        {pets.length > 1 && (
          <div
            role="group"
            aria-label="Escolha o baixinho"
            className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-6"
          >
            {pets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPetId(p.id)}
                aria-pressed={selectedPetId === p.id}
                className="choice rounded-full! pl-1.5! pr-4! shrink-0 gap-2!"
              >
                <PetAvatar pet={p} size="xs" />
                {p.name}
              </button>
            ))}
          </div>
        )}

        {activePet && (
          <section
            aria-labelledby="pet-day-title"
            className="flex items-center gap-4 sm:gap-6"
          >
            <PetAvatar pet={activePet} size="xl" />
            <div className="min-w-0">
              <p className="text-sm sm:text-base text-ink-soft first-letter:uppercase">
                {longDate}
              </p>
              <h1
                id="pet-day-title"
                className="font-display text-4xl sm:text-6xl font-extrabold text-ink leading-[1.02] tracking-tight"
              >
                O dia {activePet.gender === "femea" ? "da" : "do"}{" "}
                {activePet.name}
              </h1>
              <div className="mt-2.5">
                <StatusBadge
                  type="attendance"
                  value={attendance?.status || "expected"}
                />
              </div>
            </div>
          </section>
        )}

        <div className="mt-8 sm:mt-10 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
          {/* ======================= LINHA DO TEMPO DO DIA ======================= */}
          <section aria-labelledby="timeline-title" className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 mb-5">
              <h2 id="timeline-title" className="text-xl font-bold text-ink">
                Linha do tempo
              </h2>
              <p className="text-xs text-ink-soft">
                Fotos disponíveis até o fim do dia
              </p>
            </div>

            <ol className="relative">
              {logsBefore.map((l) => renderActivity(l))}

              <TimelineItem
                tone="blue"
                icon={<LogIn className="w-4 h-4" />}
                time={
                  attendance?.check_in_time
                    ? formatTimeBR(attendance.check_in_time)
                    : null
                }
                title={
                  attendance?.check_in_time
                    ? "Chegou na creche"
                    : attendance?.status === "absent"
                      ? "Não veio hoje"
                      : "Ainda não chegou"
                }
                muted={!attendance?.check_in_time}
              />

              {logsDuring.map((l) => renderActivity(l))}

              {timelineLogs.length === 0 && (
                <TimelineItem
                  tone="pink"
                  icon={<Camera className="w-4 h-4" />}
                  time={null}
                  title="As fotos das atividades aparecem aqui"
                  muted
                >
                  <p className="mt-1 text-sm text-ink-soft">
                    A equipe publica ao longo do dia. Volte mais tarde ou toque
                    em atualizar.
                  </p>
                </TimelineItem>
              )}

              <TimelineItem
                tone="blue"
                icon={<LogOut className="w-4 h-4" />}
                time={
                  attendance?.check_out_time
                    ? formatTimeBR(attendance.check_out_time)
                    : null
                }
                title={attendance?.check_out_time ? "Saiu da creche" : "Saída"}
                muted={!attendance?.check_out_time}
                last={logsAfter.length === 0}
              >
                {!attendance?.check_out_time && attendance?.check_in_time && (
                  <p className="mt-0.5 text-sm text-ink-soft">
                    Ainda está na creche.
                  </p>
                )}
              </TimelineItem>

              {logsAfter.map((l, i) => renderActivity(l, i === logsAfter.length - 1))}
            </ol>
          </section>

          {/* ======================= CUIDADOS DO DIA ======================= */}
          <aside
            aria-labelledby="care-title"
            className="lg:sticky lg:top-24 space-y-4 lg:order-none -order-1"
          >
            <h2 id="care-title" className="text-xl font-bold text-ink">
              Cuidados do dia
            </h2>

            {hasCareNotes && activeReport ? (
              <>
                {activeReport.free_observations && (
                  <figure className="rounded-2xl bg-brand-pink-light p-5">
                    <Heart className="w-5 h-5 text-brand-pink-ink" />
                    <blockquote className="mt-2 text-[15px] text-ink leading-relaxed">
                      {activeReport.free_observations}
                    </blockquote>
                    <figcaption className="mt-2 text-sm text-ink-soft">
                      Recado da equipe
                    </figcaption>
                  </figure>
                )}

                <div className="panel divide-y divide-line">
                  <CareRow
                    icon={<Utensils className="w-4 h-4" />}
                    label="Alimentação"
                    note={activeReport.feeding_notes}
                  >
                    <StatusBadge type="feeding" value={activeReport.feeding} />
                  </CareRow>
                  <CareRow
                    icon={<Moon className="w-4 h-4" />}
                    label="Soneca depois do almoço"
                    note={activeReport.nap_notes}
                  >
                    <StatusBadge
                      type="nap"
                      value={activeReport.nap_after_lunch}
                    />
                  </CareRow>
                  {activeReport.behavior_socialization && (
                    <CareRow
                      icon={<Sparkles className="w-4 h-4" />}
                      label="Comportamento"
                      note={activeReport.behavior_socialization}
                    />
                  )}
                </div>
              </>
            ) : (
              <p className="panel border-dashed p-5 text-sm text-ink-soft leading-relaxed">
                A equipe preenche alimentação, soneca e recado ao longo do dia.
              </p>
            )}
          </aside>
        </div>
      </main>

      {/* Lightbox de Foto em Tela Cheia (Esc fecha, ← → navegam) */}
      {lightbox &&
        (() => {
          const photos = lightbox.activity.photos;
          const photo = photos[lightbox.index];
          if (!photo) return null;
          const go = (delta: number) =>
            setLightbox({
              ...lightbox,
              index: (lightbox.index + delta + photos.length) % photos.length,
            });
          return (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${lightbox.activity.title}: foto ${lightbox.index + 1} de ${photos.length}`}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink-dark/95 animate-fade-in"
              onClick={() => setLightbox(null)}
            >
              <div
                className="relative max-w-4xl w-full max-h-[94dvh] flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full flex items-center justify-between gap-3 text-white pb-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-base sm:text-lg truncate">
                      {lightbox.activity.title}
                    </h2>
                    <p className="text-sm text-white/70 tabular">
                      {lightbox.index + 1} de {photos.length}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadPhoto(
                          photoUrl(photo),
                          photoFileName(
                            lightbox.activity.title,
                            lightbox.index,
                          ),
                          photo.id,
                        )
                      }
                      disabled={downloadingPhotoId === photo.id}
                      className="btn btn-sm btn-primary"
                    >
                      {downloadingPhotoId === photo.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Baixar
                    </button>
                    <button
                      type="button"
                      onClick={() => setLightbox(null)}
                      aria-label="Fechar"
                      autoFocus
                      className="icon-btn text-white! hover:bg-white/15!"
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
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-ink flex items-center justify-center cursor-pointer"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        type="button"
                        onClick={() => go(1)}
                        aria-label="Próxima foto"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-ink flex items-center justify-center cursor-pointer"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </div>

                {photo.caption && !/^Foto \d+$/.test(photo.caption) && (
                  <p className="text-sm text-white/85 text-center mt-3">
                    {photo.caption}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

      <SiteFooter className="max-w-5xl mx-auto w-full" />
    </div>
  );
}

/** Um ponto da linha do tempo: marcador redondo, horário e conteúdo. */
function TimelineItem({
  tone,
  icon,
  time,
  title,
  muted,
  last,
  children,
}: {
  tone: "pink" | "blue";
  icon: React.ReactNode;
  time: string | null;
  title: string;
  muted?: boolean;
  last?: boolean;
  children?: React.ReactNode;
}) {
  const marker = muted
    ? "bg-white text-ink-soft ring-2 ring-inset ring-line"
    : tone === "pink"
      ? "bg-brand-pink text-ink"
      : "bg-brand-blue text-ink";
  return (
    <li className={`relative pl-14 ${last ? "" : "pb-8"}`}>
      {!last && (
        <span
          aria-hidden
          className="absolute left-[19px] top-11 bottom-1 w-0.5 rounded-full bg-line"
        />
      )}
      <span
        aria-hidden
        className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center ${marker}`}
      >
        {icon}
      </span>
      <div className="pt-1.5">
        {time && (
          <p className="font-display text-sm font-bold text-brand-pink-ink tabular leading-none mb-1">
            {time}
          </p>
        )}
        <h3
          className={`text-lg sm:text-xl font-bold leading-snug ${muted ? "text-ink-soft" : "text-ink"}`}
        >
          {title}
        </h3>
        {children}
      </div>
    </li>
  );
}

function CareRow({
  icon,
  label,
  note,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  note?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink font-sans">
          <span className="text-brand-blue-ink">{icon}</span>
          {label}
        </h3>
        {children}
      </div>
      {note && (
        <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{note}</p>
      )}
    </div>
  );
}
