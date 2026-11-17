"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  getGuardians,
  saveGuardian,
  getPets,
  linkGuardianToPet
} from "@/services/db-service";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Guardian, Pet } from "@/types/database.types";
import { Modal } from "@/components/ui/Modal";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Edit3,
  MessageSquare,
  Loader2
} from "lucide-react";

/** Monta o link do WhatsApp com DDI 55 apenas quando ainda não estiver presente. */
function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}`;
}

export default function ResponsaveisPage() {
  const { toast } = useFeedback();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Partial<Guardian> | null>(null);
  const [selectedPetIdToLink, setSelectedPetIdToLink] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [allGuardians, allPets] = await Promise.all([unwrap(getGuardians()), unwrap(getPets())]);
        setGuardians(allGuardians);
        setPets(allPets);
      } catch (err) {
        toast.error(errorMessage(err, "Erro ao carregar responsáveis."));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  const handleOpenNew = () => {
    setEditingGuardian({
      full_name: "",
      phone: "",
      email: "",
      notes: "",
    });
    setSelectedPetIdToLink("");
    setModalOpen(true);
  };

  const handleOpenEdit = (g: Guardian) => {
    setEditingGuardian({ ...g });
    setSelectedPetIdToLink("");
    setModalOpen(true);
  };

  const handleSaveGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuardian || !editingGuardian.full_name || !editingGuardian.full_name.trim()) {
      toast.error("Por favor, preencha o nome do responsável.");
      return;
    }
    if ((editingGuardian.phone || "").replace(/\D/g, "").length < 10) {
      toast.error("Informe o telefone com DDD (ex: (11) 98765-4321).");
      return;
    }

    try {
      setIsSaving(true);
      const saved = await unwrap(saveGuardian(editingGuardian));

      if (selectedPetIdToLink) {
        await unwrap(linkGuardianToPet(selectedPetIdToLink, saved.id));
      }

      setGuardians(prev => {
        const idx = prev.findIndex(g => g.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved];
      });

      setModalOpen(false);
      setEditingGuardian(null);
      toast.success(editingGuardian.id ? "Responsável atualizado." : "Responsável cadastrado com sucesso!");
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Erro ao salvar responsável."));
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return guardians.filter(g =>
      !term ||
      g.full_name.toLowerCase().includes(term) ||
      (digits && g.phone.replace(/\D/g, "").includes(digits)) ||
      (g.email && g.email.toLowerCase().includes(term))
    );
  }, [guardians, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Responsáveis & Tutores</h1>
            <span className="bg-brand-blue/15 text-brand-blue-ink text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {guardians.length} cadastrados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Gestão de contatos, WhatsApp para envio de relatórios e acesso ao portal
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue-dark shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Responsável</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, telefone ou e-mail..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-brand-blue shadow-2xs"
        />
      </div>

      {/* List */}
      {loading ? (
        <CardGridSkeleton label="Carregando responsáveis..." />
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
          <p className="text-sm font-semibold text-ink">Nenhum responsável encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-brand-blue/30 to-brand-pink/30 flex items-center justify-center text-ink font-bold text-sm">
                      {g.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-ink leading-tight">{g.full_name}</h3>
                      <p className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {g.phone || "Sem telefone cadastrado"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(g)}
                    aria-label={`Editar ${g.full_name}`}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {g.email && (
                  <p className="text-xs text-ink-soft flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {g.email}
                  </p>
                )}

                {g.notes && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-ink">
                    <span className="text-[10px] font-bold text-slate-400 block">OBSERVAÇÕES</span>
                    {g.notes}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <a
                  href={whatsappLink(g.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-600 hover:underline font-semibold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chamar no WhatsApp
                </a>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(g)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      <Modal
        open={modalOpen && !!editingGuardian}
        onClose={() => setModalOpen(false)}
        locked={isSaving}
        size="md"
        title={editingGuardian?.id ? "Editar Responsável" : "Cadastrar Novo Responsável"}
        subtitle="Contato usado no WhatsApp e no acesso ao portal"
        icon={
          <div className="w-9 h-9 rounded-xl bg-brand-blue/15 text-brand-blue-ink flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        }
      >
        {editingGuardian && (
            <form onSubmit={handleSaveGuardian} className="p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="font-bold text-ink">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editingGuardian.full_name || ""}
                  onChange={(e) => setEditingGuardian(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Ex: Mariana Silva"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-ink">Telefone WhatsApp *</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={editingGuardian.phone || ""}
                    onChange={(e) => setEditingGuardian(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Ex: (11) 98765-4321"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink">E-mail</label>
                  <input
                    type="email"
                    value={editingGuardian.email || ""}
                    onChange={(e) => setEditingGuardian(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="mariana@exemplo.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Observações e Autorizações</label>
                <textarea
                  rows={2}
                  value={editingGuardian.notes || ""}
                  onChange={(e) => setEditingGuardian(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ex: Autorizou fotos; prefere retirada após às 18h"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Vincular com Pet */}
              <div className="space-y-1 border-t border-slate-100 pt-3">
                <label className="font-bold text-ink">Vincular a um Cão:</label>
                <select
                  value={selectedPetIdToLink}
                  onChange={(e) => setSelectedPetIdToLink(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Selecione um cão (ou vincule depois)</option>
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.breed || "SRD"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-brand-blue-ink hover:bg-ink rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
        )}
      </Modal>
    </div>
  );
}

