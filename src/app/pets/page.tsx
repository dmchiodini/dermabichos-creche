"use client";

import React, { useState, useEffect } from "react";
import { 
  getPets, 
  savePet, 
  getGuardians, 
  getGuardiansForPet, 
  linkGuardianToPet 
} from "@/services/db-service";
import { Pet, Guardian, PetSize, PetStatus } from "@/types/database.types";
import { PetAvatar } from "@/components/PetAvatar";
import { 
  Dog, 
  Plus, 
  Search, 
  Edit3, 
  UserCheck, 
  Utensils, 
  ShieldAlert, 
  Heart, 
  Check, 
  X,
  Phone,
  Eye,
  Calendar
} from "lucide-react";

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [petGuardiansMap, setPetGuardiansMap] = useState<Record<string, Guardian[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>("all");

  // Modal de Criação / Edição de Pet
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Partial<Pet> | null>(null);
  const [selectedGuardianIdToLink, setSelectedGuardianIdToLink] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const allPets = await getPets();
      const allGuardians = await getGuardians();
      setPets(allPets);
      setGuardians(allGuardians);

      const map: Record<string, Guardian[]> = {};
      for (const p of allPets) {
        map[p.id] = await getGuardiansForPet(p.id);
      }
      setPetGuardiansMap(map);
      setLoading(false);
    }
    load();
  }, []);

  const handleOpenNewPet = () => {
    setEditingPet({
      name: "",
      photo_url: "",
      breed: "",
      gender: "macho",
      size: "medio",
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
    if (!editingPet || !editingPet.name) return;

    const saved = await savePet(editingPet);

    // Se selecionou um responsável para vincular
    if (selectedGuardianIdToLink) {
      await linkGuardianToPet(saved.id, selectedGuardianIdToLink);
      const updatedGList = await getGuardiansForPet(saved.id);
      setPetGuardiansMap(prev => ({ ...prev, [saved.id]: updatedGList }));
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
  };

  const handleToggleStatus = async (pet: Pet) => {
    const nextStatus: PetStatus = pet.status === "active" ? "inactive" : "active";
    const updated = await savePet({ ...pet, status: nextStatus });
    setPets(prev => prev.map(p => p.id === pet.id ? updated : p));
  };

  const filtered = pets.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.breed && p.breed.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSize = selectedSizeFilter === "all" || p.size === selectedSizeFilter;
    return matchesSearch && matchesSize;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#25313B]">Pets Cadastrados</h1>
            <span className="bg-[#CD8DA7]/15 text-[#CD8DA7] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {pets.length} cães
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5B6570] mt-0.5">
            Ficha cadastral, temperamento, restrições alimentares e responsáveis
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNewPet}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#CD8DA7] hover:bg-[#b87791] shadow-xs transition-colors self-start sm:self-auto"
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
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#79B7DE] shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {["all", "pequeno", "medio", "grande"].map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSizeFilter(size)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                selectedSizeFilter === size
                  ? "bg-[#25313B] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {size === "all" ? "Todos os Portes" : size}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Pets */}
      {loading ? (
        <div className="text-center py-12 text-[#5B6570]">Carregando pets...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
          <p className="text-sm font-semibold text-[#25313B]">Nenhum pet encontrado.</p>
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
                          <h3 className="font-bold text-base text-[#25313B] leading-tight">{pet.name}</h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            pet.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {pet.status === "active" ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <p className="text-xs text-[#5B6570] mt-0.5">
                          {pet.breed || "SRD"} • {pet.gender === "macho" ? "Macho" : "Fêmea"} • {pet.approximate_age}
                        </p>
                        <span className="inline-block mt-1 text-[10px] uppercase font-bold text-[#79B7DE] bg-[#79B7DE]/10 px-2 py-0.5 rounded">
                          Porte {pet.size}
                        </span>
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
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[#25313B]">
                        <span className="text-slate-400 block text-[10px] font-semibold">TEMPERAMENTO</span>
                        {pet.temperament}
                      </div>
                    )}

                    {pet.diet_restrictions && (
                      <div className="bg-[#CD8DA7]/10 p-2.5 rounded-xl border border-[#CD8DA7]/20 text-[#25313B] flex items-start gap-2">
                        <Utensils className="w-4 h-4 text-[#CD8DA7] flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[10px] text-[#CD8DA7]">DIETA & ALIMENTAÇÃO</strong>
                          <span>{pet.diet_restrictions}</span>
                        </div>
                      </div>
                    )}

                    {pet.allergies && (
                      <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100 text-rose-900 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-[#25313B] font-medium"
                        >
                          <Phone className="w-3 h-3 text-[#79B7DE]" />
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
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    {pet.status === "active" ? "Desativar Pet" : "Reativar Pet"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditPet(pet)}
                    className="text-xs font-semibold text-[#79B7DE] hover:underline"
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
      {modalOpen && editingPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-[#25313B]">
                {editingPet.id ? `Editar Pet: ${editingPet.name}` : "Cadastrar Novo Pet"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePet} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#25313B]">Nome do Pet *</label>
                  <input
                    type="text"
                    required
                    value={editingPet.name || ""}
                    onChange={(e) => setEditingPet(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Thor"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#25313B]">Raça</label>
                  <input
                    type="text"
                    value={editingPet.breed || ""}
                    onChange={(e) => setEditingPet(prev => ({ ...prev, breed: e.target.value }))}
                    placeholder="Ex: Golden Retriever"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#25313B]">Sexo</label>
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
                  <label className="font-bold text-[#25313B]">Porte *</label>
                  <select
                    value={editingPet.size || "medio"}
                    onChange={(e) => setEditingPet(prev => ({ ...prev, size: e.target.value as PetSize }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="pequeno">Pequeno</option>
                    <option value="medio">Médio</option>
                    <option value="grande">Grande</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#25313B]">Idade Aproximada</label>
                  <input
                    type="text"
                    value={editingPet.approximate_age || ""}
                    onChange={(e) => setEditingPet(prev => ({ ...prev, approximate_age: e.target.value }))}
                    placeholder="Ex: 2 anos"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#25313B]">Link da Foto de Perfil (Opcional)</label>
                <input
                  type="url"
                  value={editingPet.photo_url || ""}
                  onChange={(e) => setEditingPet(prev => ({ ...prev, photo_url: e.target.value }))}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#25313B]">Temperamento & Convivência</label>
                <textarea
                  rows={2}
                  value={editingPet.temperament || ""}
                  onChange={(e) => setEditingPet(prev => ({ ...prev, temperament: e.target.value }))}
                  placeholder="Ex: Muito dócil, adora outros cães, medos específicos..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#25313B]">Restrições Alimentares / Dieta</label>
                <input
                  type="text"
                  value={editingPet.diet_restrictions || ""}
                  onChange={(e) => setEditingPet(prev => ({ ...prev, diet_restrictions: e.target.value }))}
                  placeholder="Ex: Ração hipoalergênica às 12h, sem petisco de frango"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#25313B]">Alergias & Cuidados Especiais</label>
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
                <label className="font-bold text-[#25313B]">Vincular a um Responsável:</label>
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
                  className="px-5 py-2 text-xs font-bold text-white bg-[#CD8DA7] hover:bg-[#b87791] rounded-xl shadow-xs"
                >
                  Salvar Pet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
