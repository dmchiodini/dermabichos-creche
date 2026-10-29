"use client";

import React, { useState, useEffect } from "react";
import { getStaffMembers, saveStaffMember } from "@/services/db-service";
import { StaffMember } from "@/types/database.types";
import {
  UserCheck,
  Plus,
  Edit3,
  Shield,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { formatDateBR } from "@/lib/date-utils";

export default function FuncionariosPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<StaffMember> | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const list = await getStaffMembers();
      setStaff(list);
      setLoading(false);
    }
    load();
  }, []);

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
    if (!editingStaff || !editingStaff.name) return;

    const saved = await saveStaffMember(editingStaff);
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
  };

  const handleToggleActive = async (s: StaffMember) => {
    const updated = await saveStaffMember({ ...s, active: !s.active });
    setStaff(prev => prev.map(item => item.id === s.id ? updated : item));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#25313B]">Equipe da Creche</h1>
            <span className="bg-[#79B7DE]/15 text-[#79B7DE] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {staff.length} colaboradores
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5B6570] mt-0.5">
            Monitores responsáveis pelo registro operacional e cuidados diários
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#79B7DE] hover:bg-[#5ea4d0] shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Monitor</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5B6570]">Carregando equipe...</div>
      ) : staff.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
          <p className="text-sm font-semibold text-[#25313B]">Nenhum colaborador cadastrado.</p>
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
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#CD8DA7]/30 to-[#79B7DE]/30 flex items-center justify-center text-[#25313B] font-bold text-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#25313B] leading-tight">{member.name}</h3>
                    <p className="text-xs text-[#5B6570]">{member.role_title}</p>
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
                  className="text-xs font-semibold text-[#79B7DE] hover:underline"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      {modalOpen && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-[#25313B]">
                {editingStaff.id ? "Editar Colaborador" : "Cadastrar Monitor"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="font-bold text-[#25313B]">Nome Completo *</label>
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
                <label className="font-bold text-[#25313B]">Cargo / Função</label>
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
                  className="px-5 py-2 text-xs font-bold text-white bg-[#79B7DE] hover:bg-[#5ea4d0] rounded-xl shadow-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

