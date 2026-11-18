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
import { PageShell, PageHeader, EmptyState } from "@/components/ui/Page";
import {
  UserCheck,
  Plus,
  Edit3,
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
    <PageShell>
      <PageHeader
        title="Equipe"
        count={staff.length}
        description="Quem registra a rotina dos baixinhos e publica as fotos do dia."
        actions={
          <button type="button" onClick={handleOpenNew} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Cadastrar monitora
          </button>
        }
      />

      {loading ? (
        <CardGridSkeleton count={3} label="Carregando equipe..." />
      ) : staff.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-6 h-6" />}
          title="Ninguém na equipe ainda"
          action={
            <button type="button" onClick={handleOpenNew} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Cadastrar monitora
            </button>
          }
        >
          Cadastre as monitoras para que elas possam entrar e registrar a rotina.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <li key={member.id} className={`panel p-5 flex flex-col gap-5 ${member.active ? "" : "bg-paper!"}`}>
              <div className="flex items-center gap-4">
                <PetAvatar pet={{ name: member.name, photo_url: member.photo_url }} size="lg" />
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink leading-tight">{member.name}</h2>
                  <p className="text-sm text-ink-soft">{member.role_title}</p>
                  <p className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold ${member.active ? "text-emerald-800" : "text-ink-soft"}`}>
                    <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${member.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {member.active ? "Acesso liberado" : "Acesso desativado"}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-line">
                <button type="button" onClick={() => handleToggleActive(member)} className="btn btn-sm btn-ghost">
                  {member.active ? "Desativar acesso" : "Reativar acesso"}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(member)}
                  aria-label={`Editar ${member.name}`}
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
        open={modalOpen && !!editingStaff}
        onClose={() => setModalOpen(false)}
        locked={isSaving}
        size="sm"
        title={editingStaff?.id ? "Editar colaborador" : "Cadastrar monitora"}
        icon={
          <div className="w-10 h-10 rounded-xl bg-brand-blue-light text-brand-blue-ink flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        }
      >
        {editingStaff && (
          <form onSubmit={handleSave} className="px-4 sm:px-6 py-5 space-y-4 text-sm">
            <ProfilePhotoField
              photoUrl={editingStaff.photo_url}
              name={editingStaff.name}
              kind="person"
              disabled={isSaving}
              onChange={(photo_url) => setEditingStaff(prev => ({ ...prev, photo_url }))}
            />

            <div>
              <label htmlFor="staff-name" className="field-label">Nome completo</label>
              <input
                id="staff-name"
                type="text"
                required
                value={editingStaff.name || ""}
                onChange={(e) => setEditingStaff(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex.: Ana Paula de Souza"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="staff-role" className="field-label">Função</label>
              <input
                id="staff-role"
                type="text"
                required
                value={editingStaff.role_title || ""}
                onChange={(e) => setEditingStaff(prev => ({ ...prev, role_title: e.target.value }))}
                placeholder="Ex.: Monitora de creche"
                className="field"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-line">
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Salvando..." : editingStaff.id ? "Salvar alterações" : "Cadastrar"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PageShell>
  );
}
