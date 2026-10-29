"use client";

import React, { useState, useEffect } from "react";
import {
  getGuardianPortalPetsAndTodayReports,
  getGuardians
} from "@/services/db-service";
import { Pet, DailyReport, Guardian } from "@/types/database.types";
import {
  formatDateBR,
  formatTimeBR,
  getTodayDateString
} from "@/lib/date-utils";
import { PetAvatar } from "@/components/PetAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dog,
  Clock,
  Utensils,
  Flame,
  Camera,
  ShieldCheck,
  AlertTriangle,
  LogOut,
  Heart,
  Calendar,
  Sparkles,
  Info
} from "lucide-react";

export default function PortalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phoneOrEmailInput, setPhoneOrEmailInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [todayStr, setTodayStr] = useState<string>("2026-10-29");

  useEffect(() => {
    setTodayStr(getTodayDateString());

    // Se houver telefone ou email nos parâmetros da URL (ex: vindo direto do link do WhatsApp)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTutor = params.get("tutor") || params.get("phone");
      if (urlTutor) {
        setPhoneOrEmailInput(urlTutor);
        // Tenta auto login se vier com parâmetro
        autoLoginWithParam(urlTutor);
      }
    }
  }, []);

  const autoLoginWithParam = async (identifier: string) => {
    setLoading(true);
    try {
      const allGuardians = await getGuardians();
      const cleanPhone = identifier.replace(/\D/g, "");

      const found = allGuardians.find(g =>
        (cleanPhone && g.phone.replace(/\D/g, "").includes(cleanPhone)) ||
        (g.email && g.email.toLowerCase() === identifier.toLowerCase().trim())
      );

      if (found) {
        const portalData = await getGuardianPortalPetsAndTodayReports(identifier);
        setGuardian(portalData.guardian);
        setPets(portalData.pets);
        setReports(portalData.reports);
        if (portalData.pets.length > 0) {
          setSelectedPetId(portalData.pets[0].id);
        }
        setIsAuthenticated(true);
      }
    } catch {
      // Ignora erro no auto login silencioso
    } finally {
      setLoading(false);
    }
  };

  // Login sem senha: apenas telefone ou e-mail
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      const allGuardians = await getGuardians();
      const cleanPhone = phoneOrEmailInput.replace(/\D/g, "");

      const found = allGuardians.find(g =>
        (cleanPhone && g.phone.replace(/\D/g, "").includes(cleanPhone)) ||
        (g.email && g.email.toLowerCase() === phoneOrEmailInput.toLowerCase().trim())
      );

      if (!found) {
        setAuthError("Nenhum responsável encontrado com esse telefone ou e-mail. Verifique se o cadastro foi realizado pela equipe da creche.");
        setLoading(false);
        return;
      }

      // Login bem sucedido
      const portalData = await getGuardianPortalPetsAndTodayReports(phoneOrEmailInput);
      setGuardian(portalData.guardian);
      setPets(portalData.pets);
      setReports(portalData.reports);
      if (portalData.pets.length > 0) {
        setSelectedPetId(portalData.pets[0].id);
      }
      setIsAuthenticated(true);
    } catch {
      setAuthError("Erro ao acessar o portal. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setGuardian(null);
    setPets([]);
    setReports([]);
    setSelectedPetId("");
    setPhoneOrEmailInput("");
  };

  // Pet ativo selecionado
  const activePet = pets.find(p => p.id === selectedPetId);
  const activeReport = reports.find(r => r.pet_id === selectedPetId);

  // -------------------------------------------------------------
  // TELA DE LOGIN DO PORTAL DO TUTOR
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fbf2f6] to-[#f0f7fc] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#CD8DA7] to-[#79B7DE] flex items-center justify-center text-white mx-auto shadow-md">
              <Dog className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-[#25313B] tracking-tight">Portal do Responsável</h1>
            <p className="text-xs text-[#5B6570]">
              Acompanhamento diário da Creche Dermabichos
            </p>
          </div>

          <div className="bg-[#79B7DE]/10 border border-[#79B7DE]/30 rounded-xl p-3 text-xs text-[#25313B] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#79B7DE] flex-shrink-0 mt-0.5" />
            <p>
              Acesso exclusivo para visualização dos registros de <strong>hoje ({formatDateBR(todayStr)})</strong> dos seus pets cadastrados.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#25313B]">Seu Telefone (WhatsApp) ou E-mail:</label>
              <input
                type="text"
                required
                value={phoneOrEmailInput}
                onChange={(e) => setPhoneOrEmailInput(e.target.value)}
                placeholder="Ex: (11) 98765-4321 ou seu@email.com"
                className="w-full text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#79B7DE] transition-colors shadow-2xs font-medium"
              />
              <p className="text-[11px] text-[#5B6570]">
                Acesso direto sem senha: basta informar o número ou e-mail cadastrado na creche.
              </p>
            </div>

            {authError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg font-medium">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#CD8DA7] to-[#CD8DA7]/90 hover:opacity-95 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? "Acessando..." : "Acessar"}
            </button>
          </form>

          {/* Dica para teste rápido de demonstração */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 mb-1.5 font-medium">Clique para testar com um tutor cadastrado:</p>
            <div className="flex flex-wrap justify-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setPhoneOrEmailInput("11987654321")}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
              >
                Mariana (Thor)
              </button>
              <button
                type="button"
                onClick={() => setPhoneOrEmailInput("11991234567")}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
              >
                Carlos (Pipoca)
              </button>
              <button
                type="button"
                onClick={() => setPhoneOrEmailInput("11976543210")}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
              >
                Renata (Mel & Bob)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ÁREA DO CLIENTE AUTENTICADO (APENAS DIA ATUAL)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header do Portal */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#CD8DA7] to-[#79B7DE] flex items-center justify-center text-white">
              <Dog className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#25313B]">Dermabichos Creche</h2>
              <p className="text-[11px] text-[#5B6570]">Olá, {guardian?.full_name}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full px-4 py-5 space-y-4 flex-1">
        {/* Banner do Dia Atual */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#CD8DA7]" />
            <span className="text-xs font-bold text-[#25313B]">
              Diário de Hoje: {formatDateBR(todayStr)}
            </span>
          </div>
          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
            Ao vivo
          </span>
        </div>

        {/* Seletor de Cão se o tutor tiver mais de um */}
        {pets.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-[#5B6570]">Seus cães:</span>
            {pets.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPetId(p.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedPetId === p.id
                  ? "bg-[#25313B] text-white shadow-xs"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PetAvatar pet={activePet} size="lg" />
                <div>
                  <h1 className="text-lg font-extrabold text-[#25313B] leading-tight">
                    {activePet.name}
                  </h1>
                  <p className="text-xs text-[#5B6570]">
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
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Horário de Entrada</span>
                <span className="font-bold text-[#25313B] text-sm">
                  {activeReport?.attendance?.check_in_time
                    ? formatTimeBR(activeReport.attendance.check_in_time)
                    : "Ainda não chegou"}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Horário de Saída</span>
                <span className="font-bold text-[#25313B] text-sm">
                  {activeReport?.attendance?.check_out_time
                    ? formatTimeBR(activeReport.attendance.check_out_time)
                    : "Em estadia"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Resumo da Rotina Diária */}
        {activeReport ? (
          <div className="space-y-4">
            {/* Bloco Alimentação & Soneca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#25313B]">
                    <Utensils className="w-4 h-4 text-[#CD8DA7]" />
                    <span>Alimentação</span>
                  </div>
                  <StatusBadge type="feeding" value={activeReport.feeding} />
                </div>
                <p className="text-xs text-[#5B6570]">
                  {activeReport.feeding_notes || "Refeição supervisionada pela equipe de cuidadores."}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#25313B]">
                    <Clock className="w-4 h-4 text-[#79B7DE]" />
                    <span>Soneca Pós-Almoço</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {activeReport.nap_after_lunch === "sim" ? "Descansou 😴" : activeReport.nap_after_lunch === "nao" ? "Ficou ativo" : "Não informado"}
                  </span>
                </div>
                <p className="text-xs text-[#5B6570]">
                  {activeReport.nap_notes || "Momento de calmaria e descanso em ambiente climatizado."}
                </p>
              </div>
            </div>

            {/* Atividades e Socialização */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#25313B]">
                  <Flame className="w-4 h-4 text-[#79B7DE]" />
                  <span>Brincadeiras & Atividades</span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {activeReport.activities_participation === "participou" ? "Participou ativamente" : "Atividades livres"}
                </span>
              </div>
              <p className="text-xs text-[#5B6570] leading-relaxed">
                {activeReport.activities_notes || "Interações recreativas e enriquecimento ambiental com a matilha."}
              </p>

              {activeReport.behavior_socialization && (
                <div className="pt-2 border-t border-slate-100 text-xs text-[#25313B]">
                  <strong>Socialização:</strong> {activeReport.behavior_socialization}
                </div>
              )}
            </div>

            {/* Observações da Equipe */}
            {activeReport.free_observations && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
                <span className="font-bold text-xs text-[#25313B] flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-[#CD8DA7]" /> Recadinho do Cuidador
                </span>
                <p className="text-xs text-[#5B6570] leading-relaxed">
                  {activeReport.free_observations}
                </p>
              </div>
            )}

            {/* Galeria de Fotos do Dia (com aviso obrigatório de expiração em 7 dias) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#CD8DA7]" />
                  <h3 className="font-bold text-sm text-[#25313B]">Fotos do Dia</h3>
                  <span className="text-xs font-normal text-slate-500">
                    ({activeReport.photos?.length || 0}/5)
                  </span>
                </div>

                <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Expira em 7 dias
                </span>
              </div>

              {/* Aviso da regra de 7 dias */}
              <div className="p-2.5 bg-amber-50/70 border border-amber-100 rounded-xl text-[11px] text-amber-900">
                As fotos do dia são temporárias e ficam salvas por até <strong>7 dias</strong> para compartilhamento dos momentos. Baixe as fotos que desejar guardar!
              </div>

              {activeReport.photos && activeReport.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {activeReport.photos.map((photo, i) => (
                    <div
                      key={photo.id || i}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-2xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.storage_url || photo.file_path}
                        alt={photo.caption || "Foto do dia"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {photo.caption && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white text-[11px]">
                          {photo.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Nenhuma foto anexada até o momento. Nossa equipe adiciona fotos ao longo do dia!
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 shadow-2xs space-y-2">
            <Sparkles className="w-8 h-8 text-[#79B7DE] mx-auto" />
            <h3 className="font-bold text-sm text-[#25313B]">Diário em preparação</h3>
            <p className="text-xs text-[#5B6570]">
              O dia ainda está começando! Acompanhe por aqui as atualizações de alimentação, brincadeiras e fotos do seu pet.
            </p>
          </div>
        )}
      </main>

      {/* Footer do Portal */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[11px] text-[#5B6570]">
        Dermabichos Creche Canina • Cuidando com amor e respeito à matilha.
      </footer>
    </div>
  );
}
