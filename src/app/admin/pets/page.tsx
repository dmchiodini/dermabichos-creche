"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  getRegistryData,
  savePet,
  setPetGuardians
} from "@/services/db-service";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Pet, Guardian, PetStatus } from "@/types/database.types";
import { PetAvatar } from "@/components/PetAvatar";
import { Modal } from "@/components/ui/Modal";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
import { ProfilePhotoField } from "@/components/ProfilePhotoField";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DOG_BREEDS } from "@/lib/dog-breeds";
import { PageShell, PageHeader, SearchField, EmptyState } from "@/components/ui/Page";
import {
  Dog,
  Plus,
  Edit3,
  Utensils,
  ShieldAlert,
  Phone,
  Loader2,
  X,
  Users
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
  /** Responsáveis vinculados ao pet em edição (um responsável pode ter vários pets). */
  const [linkedGuardianIds, setLinkedGuardianIds] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Uma única ida ao servidor (as consultas rodam em paralelo lá).
        const { pets: allPets, guardians: allGuardians, guardiansByPet: map } =
          await unwrap(getRegistryData());
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
    setLinkedGuardianIds([]);
    setModalOpen(true);
  };

  const handleOpenEditPet = (pet: Pet) => {
    setEditingPet({ ...pet });
    setLinkedGuardianIds((petGuardiansMap[pet.id] || []).map(g => g.id));
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

      // Sincroniza os responsáveis só se a lista mudou.
      const previousIds = (petGuardiansMap[saved.id] || []).map(g => g.id);
      const changed =
        previousIds.length !== linkedGuardianIds.length ||
        previousIds.some(gid => !linkedGuardianIds.includes(gid));
      if (changed) {
        await unwrap(setPetGuardians(saved.id, linkedGuardianIds));
        setPetGuardiansMap(prev => ({
          ...prev,
          [saved.id]: linkedGuardianIds
            .map(gid => guardians.find(g => g.id === gid))
            .filter((g): g is Guardian => !!g),
        }));
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
    <PageShell>
      <PageHeader
        title="Pets"
        count={pets.length}
        description="Ficha de cada baixinho: temperamento, dieta, alergias e responsáveis."
        actions={
          <button type="button" onClick={handleOpenNewPet} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Cadastrar pet
          </button>
        }
      />

      <SearchField
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar por nome ou raça"
        label="Buscar pets"
      />

      {loading ? (
        <CardGridSkeleton label="Carregando pets..." />
      ) : filtered.length === 0 ? (
        searchTerm.trim() ? (
          <EmptyState icon={<Dog className="w-6 h-6" />} title="Nenhum pet com esse nome ou raça">
            Confira a grafia ou limpe a busca para ver todos.
          </EmptyState>
        ) : (
          <EmptyState
            icon={<Dog className="w-6 h-6" />}
            title="Nenhum pet cadastrado"
            action={
              <button type="button" onClick={handleOpenNewPet} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Cadastrar pet
              </button>
            }
          >
            Cadastre o primeiro baixinho para a monitora registrar a rotina dele.
          </EmptyState>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((pet) => {
            const petGuards = petGuardiansMap[pet.id] || [];
            const inactive = pet.status !== "active";

            return (
              <article
                key={pet.id}
                className={`panel p-5 flex flex-col gap-4 ${inactive ? "bg-paper!" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <PetAvatar pet={pet} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-ink leading-tight">{pet.name}</h2>
                      {inactive && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-ink-soft">Inativo</span>
                      )}
                    </div>
                    <p className="text-sm text-ink-soft mt-0.5">
                      {[pet.breed || "SRD", pet.gender === "macho" ? "Macho" : "Fêmea", pet.approximate_age]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>

                {(pet.temperament || pet.diet_restrictions || pet.allergies) && (
                  <div className="space-y-2 text-sm">
                    {pet.temperament && <p className="text-ink leading-relaxed">{pet.temperament}</p>}
                    {pet.diet_restrictions && (
                      <p className="flex items-start gap-2 rounded-xl bg-brand-pink-light px-3 py-2 text-ink">
                        <Utensils className="w-4 h-4 text-brand-pink-ink shrink-0 mt-0.5" />
                        <span><strong className="font-bold">Dieta:</strong> {pet.diet_restrictions}</span>
                      </p>
                    )}
                    {pet.allergies && (
                      <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-900">
                        <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                        <span><strong className="font-bold">Cuidados:</strong> {pet.allergies}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-line">
                  <h3 className="text-sm font-bold text-ink-soft font-sans">Responsáveis</h3>
                  {petGuards.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {petGuards.map((g) => (
                        <li
                          key={g.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm bg-brand-blue-light text-ink font-semibold"
                        >
                          <Users className="w-3.5 h-3.5 text-brand-blue-ink" />
                          {g.full_name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-ink-soft">Nenhum vinculado. Edite o cadastro para vincular.</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(pet)}
                    disabled={togglingId === pet.id}
                    className="btn btn-sm btn-ghost"
                  >
                    {togglingId === pet.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {inactive ? "Reativar" : "Desativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditPet(pet)}
                    aria-label={`Editar ${pet.name}`}
                    className="btn btn-sm btn-secondary"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      <Modal
        open={modalOpen && !!editingPet}
        onClose={() => setModalOpen(false)}
        locked={isSaving}
        title={editingPet?.id ? `Editar ${editingPet.name}` : "Cadastrar pet"}
        subtitle="Ficha, cuidados e responsáveis"
        icon={
          <div className="w-10 h-10 rounded-xl bg-brand-pink-light text-brand-pink-ink flex items-center justify-center">
            <Dog className="w-5 h-5" />
          </div>
        }
      >
        {editingPet && (
          <form onSubmit={handleSavePet} className="px-4 sm:px-6 py-5 space-y-5 text-sm">
            <ProfilePhotoField
              photoUrl={editingPet.photo_url}
              name={editingPet.name}
              kind="pet"
              disabled={isSaving}
              onChange={(photo_url) => setEditingPet(prev => ({ ...prev, photo_url }))}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pet-name" className="field-label">Nome</label>
                <input
                  id="pet-name"
                  type="text"
                  required
                  value={editingPet.name || ""}
                  onChange={(e) => setEditingPet(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex.: Thor"
                  className="field"
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

              <div>
                <label htmlFor="pet-gender" className="field-label">Sexo</label>
                <select
                  id="pet-gender"
                  value={editingPet.gender || "macho"}
                  onChange={(e) => setEditingPet(prev => ({ ...prev, gender: e.target.value as "macho" | "femea" }))}
                  className="field"
                >
                  <option value="macho">Macho</option>
                  <option value="femea">Fêmea</option>
                </select>
              </div>

              <div>
                <label htmlFor="pet-age" className="field-label">Idade aproximada</label>
                <input
                  id="pet-age"
                  type="text"
                  value={editingPet.approximate_age || ""}
                  onChange={(e) => setEditingPet(prev => ({ ...prev, approximate_age: e.target.value }))}
                  placeholder="Ex.: 2 anos"
                  className="field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pet-temperament" className="field-label">Temperamento e convivência</label>
              <textarea
                id="pet-temperament"
                rows={2}
                value={editingPet.temperament || ""}
                onChange={(e) => setEditingPet(prev => ({ ...prev, temperament: e.target.value }))}
                placeholder="Ex.: Muito dócil, adora outros baixinhos, tem medo de trovão"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="pet-diet" className="field-label">Dieta e restrições alimentares</label>
              <input
                id="pet-diet"
                type="text"
                value={editingPet.diet_restrictions || ""}
                onChange={(e) => setEditingPet(prev => ({ ...prev, diet_restrictions: e.target.value }))}
                placeholder="Ex.: Ração hipoalergênica às 12h, sem petisco de frango"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="pet-allergies" className="field-label">Alergias e cuidados especiais</label>
              <input
                id="pet-allergies"
                type="text"
                value={editingPet.allergies || ""}
                onChange={(e) => setEditingPet(prev => ({ ...prev, allergies: e.target.value }))}
                placeholder="Ex.: Evitar sol forte no horário mais quente"
                className="field"
              />
            </div>

            {/* Responsáveis (um pet pode ter vários; um responsável pode ter vários pets) */}
            <fieldset className="space-y-3 border-t border-line pt-5">
              <legend className="sr-only">Responsáveis</legend>
              <div className="flex items-center justify-between gap-2">
                <span className="field-label mb-0!">Responsáveis</span>
                <span className="text-xs text-ink-soft tabular">
                  {linkedGuardianIds.length} {linkedGuardianIds.length === 1 ? "vinculado" : "vinculados"}
                </span>
              </div>

              {linkedGuardianIds.length > 0 ? (
                <ul className="space-y-2">
                  {linkedGuardianIds.map((gid) => {
                    const g = guardians.find(x => x.id === gid);
                    return (
                      <li
                        key={gid}
                        className="flex items-center justify-between gap-2 py-2 pl-3.5 pr-1.5 bg-paper rounded-xl"
                      >
                        <span className="min-w-0">
                          <span className="block font-bold text-ink truncate">{g?.full_name || "Responsável removido"}</span>
                          {g?.phone && (
                            <span className="flex items-center gap-1 text-xs text-ink-soft tabular">
                              <Phone className="w-3 h-3" />
                              {g.phone}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setLinkedGuardianIds(prev => prev.filter(x => x !== gid))}
                          disabled={isSaving}
                          aria-label={`Desvincular ${g?.full_name || "responsável"}`}
                          title="Desvincular"
                          className="icon-btn hover:text-rose-700! hover:bg-rose-50!"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-ink-soft">Nenhum responsável vinculado ainda.</p>
              )}

              {guardians.some(g => !linkedGuardianIds.includes(g.id)) ? (
                <SearchableSelect
                  label="Vincular responsável"
                  value=""
                  options={guardians
                    .filter(g => !linkedGuardianIds.includes(g.id))
                    .map(g => ({ value: g.id, label: g.full_name, hint: g.phone || g.email || undefined }))}
                  onChange={(gid) => gid && setLinkedGuardianIds(prev => (prev.includes(gid) ? prev : [...prev, gid]))}
                  placeholder="Escolha para vincular"
                  searchPlaceholder="Buscar por nome ou telefone..."
                  emptyMessage="Nenhum responsável encontrado."
                  disabled={isSaving}
                />
              ) : guardians.length === 0 ? (
                <p className="field-hint">Cadastre responsáveis na aba Responsáveis para vinculá-los aqui.</p>
              ) : null}
            </fieldset>

            <div className="flex items-center justify-end gap-2 pt-5 border-t border-line">
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Salvando..." : editingPet.id ? "Salvar alterações" : "Cadastrar pet"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PageShell>
  );
}
