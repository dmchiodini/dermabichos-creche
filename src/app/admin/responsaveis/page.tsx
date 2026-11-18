"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getRegistryData, saveGuardian } from "@/services/db-service";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Guardian, Pet } from "@/types/database.types";
import { Modal } from "@/components/ui/Modal";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
import { PetAvatar } from "@/components/PetAvatar";
import { PageShell, PageHeader, SearchField, EmptyState } from "@/components/ui/Page";
import {
  Users,
  Plus,
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
  const [guardiansByPet, setGuardiansByPet] = useState<Record<string, Guardian[]>>({});

  useEffect(() => {
    async function load() {
      try {
        // Uma única ida ao servidor (as consultas rodam em paralelo lá).
        const { guardians: allGuardians, pets: allPets, guardiansByPet: map } =
          await unwrap(getRegistryData());
        setGuardians(allGuardians);
        setPets(allPets);
        setGuardiansByPet(map);
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
    setModalOpen(true);
  };

  const handleOpenEdit = (g: Guardian) => {
    setEditingGuardian({ ...g });
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

  /** Cães de cada responsável (o vínculo é feito no cadastro do pet). */
  const petsByGuardian = useMemo(() => {
    const result: Record<string, Pet[]> = {};
    for (const pet of pets) {
      for (const g of guardiansByPet[pet.id] || []) (result[g.id] ||= []).push(pet);
    }
    return result;
  }, [pets, guardiansByPet]);

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
    <PageShell>
      <PageHeader
        title="Responsáveis"
        count={guardians.length}
        description="Contatos usados no WhatsApp e no acesso ao portal. O vínculo com os baixinhos é feito no cadastro do pet."
        actions={
          <button type="button" onClick={handleOpenNew} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Cadastrar responsável
          </button>
        }
      />

      <SearchField
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar por nome, telefone ou e-mail"
        label="Buscar responsáveis"
      />

      {loading ? (
        <CardGridSkeleton label="Carregando responsáveis..." />
      ) : filtered.length === 0 ? (
        searchTerm.trim() ? (
          <EmptyState icon={<Users className="w-6 h-6" />} title="Ninguém encontrado com essa busca">
            Tente pelo nome, pelo telefone com DDD ou pelo e-mail.
          </EmptyState>
        ) : (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="Nenhum responsável cadastrado"
            action={
              <button type="button" onClick={handleOpenNew} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Cadastrar responsável
              </button>
            }
          >
            Cadastre o contato antes de vincular ao baixinho e enviar o diário pelo WhatsApp.
          </EmptyState>
        )
      ) : (
        <ul className="panel divide-y divide-line overflow-hidden">
          {filtered.map((g) => (
            <li key={g.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-start gap-3.5 min-w-0 md:w-[34%]">
                <span
                  aria-hidden
                  className="w-11 h-11 rounded-2xl bg-brand-blue text-ink font-display font-extrabold text-lg flex items-center justify-center shrink-0"
                >
                  {g.full_name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink leading-tight truncate">{g.full_name}</h2>
                  <p className="text-sm text-ink-soft tabular flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {g.phone || "Sem telefone"}
                  </p>
                  {g.email && (
                    <p className="text-sm text-ink-soft flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{g.email}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <LinkedPets pets={petsByGuardian[g.id] || []} />
                {g.notes && <p className="text-sm text-ink-soft leading-relaxed">{g.notes}</p>}
              </div>

              <div className="flex items-center gap-2 md:justify-end shrink-0">
                <a
                  href={whatsappLink(g.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-secondary text-emerald-800!"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(g)}
                  aria-label={`Editar ${g.full_name}`}
                  className="btn btn-sm btn-secondary"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal Cadastro/Edição */}
      <Modal
        open={modalOpen && !!editingGuardian}
        onClose={() => setModalOpen(false)}
        locked={isSaving}
        size="md"
        title={editingGuardian?.id ? "Editar responsável" : "Cadastrar responsável"}
        subtitle="Contato usado no WhatsApp e no acesso ao portal"
        icon={
          <div className="w-10 h-10 rounded-xl bg-brand-blue-light text-brand-blue-ink flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        }
      >
        {editingGuardian && (
          <form onSubmit={handleSaveGuardian} className="px-4 sm:px-6 py-5 space-y-4 text-sm">
            <div>
              <label htmlFor="guardian-name" className="field-label">Nome completo</label>
              <input
                id="guardian-name"
                type="text"
                required
                value={editingGuardian.full_name || ""}
                onChange={(e) => setEditingGuardian(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Ex.: Mariana Silva"
                className="field"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="guardian-phone" className="field-label">WhatsApp com DDD</label>
                <input
                  id="guardian-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={editingGuardian.phone || ""}
                  onChange={(e) => setEditingGuardian(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 98765-4321"
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="guardian-email" className="field-label">E-mail (opcional)</label>
                <input
                  id="guardian-email"
                  type="email"
                  value={editingGuardian.email || ""}
                  onChange={(e) => setEditingGuardian(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="mariana@exemplo.com"
                  className="field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="guardian-notes" className="field-label">Observações e autorizações</label>
              <textarea
                id="guardian-notes"
                rows={2}
                value={editingGuardian.notes || ""}
                onChange={(e) => setEditingGuardian(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Ex.: Autorizou fotos; prefere buscar depois das 18h"
                className="field"
              />
            </div>

            {editingGuardian.id && (
              <div className="border-t border-line pt-4 space-y-2">
                <LinkedPets pets={petsByGuardian[editingGuardian.id] || []} />
                <p className="field-hint">Para vincular ou desvincular baixinhos, edite o cadastro do pet.</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-line">
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Salvando..." : editingGuardian.id ? "Salvar alterações" : "Cadastrar responsável"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PageShell>
  );
}

function LinkedPets({ pets }: { pets: Pet[] }) {
  if (pets.length === 0) return <p className="text-sm text-ink-soft">Nenhum baixinho vinculado.</p>;
  return (
    <ul aria-label="Baixinhos vinculados" className="flex flex-wrap gap-1.5">
      {pets.map((p) => (
        <li
          key={p.id}
          className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-sm bg-brand-pink-light text-ink font-semibold"
        >
          <PetAvatar pet={p} size="xs" />
          {p.name}
        </li>
      ))}
    </ul>
  );
}
