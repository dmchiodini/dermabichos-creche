"use client";

import React, { useState, useEffect } from "react";
import { getStaffMembers, saveStaffMember } from "@/services/db-service";
import { unwrap, errorMessage } from "@/lib/action-result";
import { StaffMember } from "@/types/database.types";
import { Modal } from "@/components/ui/Modal";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
import { ProfilePhotoField } from "@/components/ProfilePhotoField";
import { PetAvatar } from "@/components/PetAvatar";
import {
  UserCheck,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";

export default function FuncionariosPage() {
  const { toast, confirm } = useFeedback();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<StaffMember> | null>(null);

  useEffect(() => {
    unwrap(getStaffMembers())
      .then(setStaff)
      .catch((err) => toast.error(errorMessage(err, "Erro ao carregar a equipe.")))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleOpenNew = () => {
    setEditingStaff({
      name: "",
      role_title: "Monitor de Creche",
      active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (s: StaffMember) => {
    setEditingStaff({ ...s });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editingStaff.name || !editingStaff.name.trim()) {
      toast.error("Por favor, preencha o nome do colaborador.");
      return;
    }

    try {
      setIsSaving(true);
      const saved = await unwrap(saveStaffMember(editingStaff));
      setStaff(prev => {
        const idx = prev.findIndex(s => s.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved];
      });

      setModalOpen(false);
      setEditingStaff(null);
      toast.success(editingStaff.id ? "Colaborador atualizado." : "Colaborador cadastrado com sucesso!");
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Erro ao salvar colaborador."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (s: StaffMember) => {
    if (s.active) {
      const ok = await confirm({
        title: `Desativar o acesso de ${s.name}?`,
        message: "O histórico de registros feitos por este colaborador é mantido. Você pode reativar a qualquer momento.",
        confirmLabel: "Desativar acesso",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      const updated = await unwrap(saveStaffMember({ ...s, active: !s.active }));
      setStaff(prev => prev.map(item => item.id === s.id ? updated : item));
      toast.success(updated.active ? "Acesso reativado." : "Acesso desativado.");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao alterar o acesso."));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Equipe da Creche</h1>
            <span className="bg-brand-blue/15 text-brand-blue-ink text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {staff.length} colaboradores
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Monitores responsáveis pelo registro operacional e cuidados diários
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue-dark shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Monitor</span>
        </button>
      </div>

      {loading ? (
        <CardGridSkeleton count={3} label="Carregando equipe..." />
      ) : staff.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
          <p className="text-sm font-semibold text-ink">Nenhum colaborador cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <PetAvatar pet={{ name: member.name, photo_url: member.photo_url }} size="md" />
                  <div>
                    <h3 className="font-bold text-base text-ink leading-tight">{member.name}</h3>
                    <p className="text-xs text-ink-soft">{member.role_title}</p>
                  </div>
                </div>

                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${member.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                  {member.active ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3" />}
                  {member.active ? "Ativo" : "Inativo"}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleActive(member)}
                  className="text-slate-500 hover:text-slate-700 underline"
                >
                  {member.active ? "Desativar Acesso" : "Reativar Acesso"}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(member)}
                  className="text-xs font-semibold text-brand-blue-ink hover:underline"
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
        open={modalOpen && !!editingStaff}
        onClose={() => setModalOpen(false)}
        locked={isSaving}
        size="sm"
        title={editingStaff?.id ? "Editar Colaborador" : "Cadastrar Monitor"}
        icon={
          <div className="w-9 h-9 rounded-xl bg-brand-blue/15 text-brand-blue-ink flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
        }
      >
        {editingStaff && (
            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
              <ProfilePhotoField
                photoUrl={editingStaff.photo_url}
                name={editingStaff.name}
                kind="person"
                disabled={isSaving}
                onChange={(photo_url) => setEditingStaff(prev => ({ ...prev, photo_url }))}
              />

              <div className="space-y-1">
                <label className="font-bold text-ink">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editingStaff.name || ""}
                  onChange={(e) => setEditingStaff(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Ana Paula de Souza"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Cargo / Função</label>
                <input
                  type="text"
                  required
                  value={editingStaff.role_title || ""}
                  onChange={(e) => setEditingStaff(prev => ({ ...prev, role_title: e.target.value }))}
                  placeholder="Ex: Monitor de Creche dos Baixinhos"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
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

