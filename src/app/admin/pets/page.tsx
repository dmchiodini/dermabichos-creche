"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  getPets,
  savePet,
  getGuardians,
  getGuardiansByPet,
  linkGuardianToPet
} from "@/services/db-service";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Pet, Guardian, PetStatus } from "@/types/database.types";
import { PetAvatar } from "@/components/PetAvatar";
import { Modal } from "@/components/ui/Modal";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
import { PetPhotoField } from "@/components/PetPhotoField";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DOG_BREEDS } from "@/lib/dog-breeds";
import {
  Dog,
  Plus,
  Search,
  Edit3,
  Utensils,
  ShieldAlert,
  Phone,
  Loader2
} from "lucide-react";

export default function PetsPage() {
  const { toast } = useFeedback();
  const [pets, setPets] = useState<Pet[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [petGuardiansMap, setPetGuardiansMap] = useState<Record<string, Guardian[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal de Criação / Edição de Pet
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPet, setEditingPet] = useState<Partial<Pet> | null>(null);
  const [selectedGuardianIdToLink, setSelectedGuardianIdToLink] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // 3 consultas em paralelo (antes: 2 sequenciais + 1 por pet).
        const [allPets, allGuardians, map] = await Promise.all([
          unwrap(getPets()),
          unwrap(getGuardians()),
          unwrap(getGuardiansByPet()),
        ]);
        setPets(allPets);
        setGuardians(allGuardians);
        setPetGuardiansMap(map);
      } catch (err) {
        toast.error(errorMessage(err, "Erro ao carregar pets."));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  const handleOpenNewPet = () => {
    setEditingPet({
      name: "",
      photo_url: "",
      breed: "",
      gender: "macho",
      approximate_age: "",
      temperament: "",
      diet_restrictions: "",
      allergies: "",
      care_notes: "",
      general_notes: "",
      status: "active",
    });
    setSelectedGuardianIdToLink("");
    setModalOpen(true);
  };

  const handleOpenEditPet = (pet: Pet) => {
    setEditingPet({ ...pet });
    setSelectedGuardianIdToLink("");
    setModalOpen(true);
  };

  const handleSavePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPet || !editingPet.name || !editingPet.name.trim()) {
      toast.error("Por favor, preencha o nome do pet.");
      return;
    }

    try {
      setIsSaving(true);
      const saved = await unwrap(savePet(editingPet));

      // Se selecionou um responsável para vincular
      if (selectedGuardianIdToLink) {
        await unwrap(linkGuardianToPet(saved.id, selectedGuardianIdToLink));
        const linked = guardians.find(g => g.id === selectedGuardianIdToLink);
        if (linked) {
          setPetGuardiansMap(prev => {
            const current = prev[saved.id] || [];
            return current.some(g => g.id === linked.id) ? prev : { ...prev, [saved.id]: [...current, linked] };
          });
        }
      }

      setPets(prev => {
        const idx = prev.findIndex(p => p.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved];
      });

      setModalOpen(false);
      setEditingPet(null);
      toast.success(editingPet.id ? "Cadastro atualizado." : `${saved.name} cadastrado com sucesso!`);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Erro ao salvar pet."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (pet: Pet) => {
    const nextStatus: PetStatus = pet.status === "active" ? "inactive" : "active";
    setTogglingId(pet.id);
    try {
      const updated = await unwrap(savePet({ ...pet, status: nextStatus }));
      setPets(prev => prev.map(p => p.id === pet.id ? updated : p));
      toast.success(nextStatus === "active" ? `${pet.name} reativado.` : `${pet.name} desativado.`);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao alterar status do pet."));
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return pets.filter(p => {
      const matchesSearch = !term || p.name.toLowerCase().includes(term) ||
                            (p.breed && p.breed.toLowerCase().includes(term));
      return matchesSearch;
    });
  }, [pets, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Pets Cadastrados</h1>
            <span className="bg-brand-pink/15 text-brand-pink-ink text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {pets.length} cães
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Ficha cadastral, temperamento, restrições alimentares e responsáveis
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNewPet}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-pink hover:bg-brand-pink-dark shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Pet</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou raça..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-brand-blue shadow-2xs"
          />
        </div>
      </div>

      {/* Grid of Pets */}
      {loading ? (
        <CardGridSkeleton label="Carregando pets..." />
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
          <p className="text-sm font-semibold text-ink">Nenhum pet encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pet) => {
            const petGuards = petGuardiansMap[pet.id] || [];

            return (
              <div
                key={pet.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <PetAvatar pet={pet} size="lg" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-ink leading-tight">{pet.name}</h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            pet.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {pet.status === "active" ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft mt-0.5">
                          {pet.breed || "SRD"} • {pet.gender === "macho" ? "Macho" : "Fêmea"} • {pet.approximate_age}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditPet(pet)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      title="Editar ficha"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Informações de Saúde e Cuidados */}
                  <div className="mt-3.5 space-y-2 text-xs">
                    {pet.temperament && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-ink">
                        <span className="text-slate-400 block text-[10px] font-semibold">TEMPERAMENTO</span>
                        {pet.temperament}
                      </div>
                    )}

                    {pet.diet_restrictions && (
                      <div className="bg-brand-pink/10 p-2.5 rounded-xl border border-brand-pink/20 text-ink flex items-start gap-2">
                        <Utensils className="w-4 h-4 text-brand-pink-ink shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[10px] text-brand-pink-ink">DIETA & ALIMENTAÇÃO</strong>
                          <span>{pet.diet_restrictions}</span>
                        </div>
                      </div>
                    )}

                    {pet.allergies && (
                      <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100 text-rose-900 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[10px] text-rose-600">ALERGIAS & CUIDADOS</strong>
                          <span>{pet.allergies}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Responsáveis Vinculados */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tutores Vinculados
                  </span>
                  {petGuards.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {petGuards.map((g) => (
                        <span
                          key={g.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-ink font-medium"
                        >
                          <Phone className="w-3 h-3 text-brand-blue-ink" />
                          {g.full_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Nenhum responsável vinculado ainda.</p>
                  )}
                </div>

                {/* Footer do Card */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(pet)}
                    disabled={togglingId === pet.id}
                    className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer disabled:opacity-50"
                  >
                    {pet.status === "active" ? "Desativar Pet" : "Reativar Pet"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditPet(pet)}
                    className="text-xs font-semibold text-brand-blue-ink hover:underline"
                  >
                    Editar Cadastro →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      <Modal
        open={modalOpen && !!editingPet}
        onClose={() => setModalOpen(false)}
        locked={isSaving}
        title={editingPet?.id ? `Editar Pet: ${editingPet.name}` : "Cadastrar Novo Pet"}
        subtitle="Ficha cadastral, cuidados e responsáveis"
        icon={
          <div className="w-9 h-9 rounded-xl bg-brand-pink/15 text-brand-pink-ink flex items-center justify-center">
            <Dog className="w-4 h-4" />
          </div>
        }
      >
        {editingPet && (
            <form onSubmit={handleSavePet} className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-ink">Nome do Pet *</label>
                  <input
                    type="text"
                    required
                    value={editingPet.name || ""}
                    onChange={(e) => setEditingPet(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Thor"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <SearchableSelect
                  label="Raça"
                  value={editingPet.breed && editingPet.breed !== "Não especificado" ? editingPet.breed : ""}
                  options={DOG_BREEDS}
                  onChange={(breed) => setEditingPet(prev => ({ ...prev, breed }))}
                  placeholder="Selecione a raça"
                  searchPlaceholder="Buscar raça..."
                  emptyMessage="Nenhuma raça encontrada."
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-ink">Sexo</label>
                  <select
                    value={editingPet.gender || "macho"}
                    onChange={(e) => setEditingPet(prev => ({ ...prev, gender: e.target.value as "macho" | "femea" }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="macho">Macho</option>
                    <option value="femea">Fêmea</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink">Idade Aproximada</label>
                  <input
                    type="text"
                    value={editingPet.approximate_age || ""}
                    onChange={(e) => setEditingPet(prev => ({ ...prev, approximate_age: e.target.value }))}
                    placeholder="Ex: 2 anos"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <PetPhotoField
                pet={editingPet}
                disabled={isSaving}
                onChange={(photo_url) => setEditingPet(prev => ({ ...prev, photo_url }))}
              />

              <div className="space-y-1">
                <label className="font-bold text-ink">Temperamento & Convivência</label>
                <textarea
                  rows={2}
                  value={editingPet.temperament || ""}
                  onChange={(e) => setEditingPet(prev => ({ ...prev, temperament: e.target.value }))}
                  placeholder="Ex: Muito dócil, adora outros cães, medos específicos..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Restrições Alimentares / Dieta</label>
                <input
                  type="text"
                  value={editingPet.diet_restrictions || ""}
                  onChange={(e) => setEditingPet(prev => ({ ...prev, diet_restrictions: e.target.value }))}
                  placeholder="Ex: Ração hipoalergênica às 12h, sem petisco de frango"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Alergias & Cuidados Especiais</label>
                <input
                  type="text"
                  value={editingPet.allergies || ""}
                  onChange={(e) => setEditingPet(prev => ({ ...prev, allergies: e.target.value }))}
                  placeholder="Ex: Evitar sol excessivo em horário quente"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Vincular Responsável */}
              <div className="space-y-1 border-t border-slate-100 pt-3">
                <label className="font-bold text-ink">Vincular a um Responsável:</label>
                <select
                  value={selectedGuardianIdToLink}
                  onChange={(e) => setSelectedGuardianIdToLink(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Selecione um tutor existente (ou deixe para depois)</option>
                  {guardians.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.full_name} ({g.phone})
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
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-brand-pink-dark hover:bg-brand-pink-ink rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? "Salvando..." : "Salvar Pet"}
                </button>
              </div>
            </form>
        )}
      </Modal>
    </div>
  );
}

