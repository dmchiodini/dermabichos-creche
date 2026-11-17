"use client";

import React, { useState, useEffect } from "react";
import {
  getActivityTemplates,
  saveActivityTemplate,
  deleteActivityTemplate
} from "@/services/db-service";
import { ActivityTemplate } from "@/types/database.types";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Modal } from "@/components/ui/Modal";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
import {
  Sparkles,
  Plus,
  Search,
  Edit3,
  Trash2,
  Check,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";

const categories = [
  "Recreação",
  "Enriquecimento Cognitivo",
  "Descanso & Relaxamento",
  "Gasto de Energia & Foco",
  "Estímulo Cognitivo",
  "Convivência de Matilha"
];

export default function AdminAtividadesPage() {
  const { toast, confirm } = useFeedback();
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ActivityTemplate> | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Recreação");
  const [defaultDescription, setDefaultDescription] = useState("");
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    unwrap(getActivityTemplates(false))
      .then(setTemplates)
      .catch((err) => toast.error(errorMessage(err, "Erro ao carregar modelos de atividades.")))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleOpenNew = () => {
    setEditingTemplate(null);
    setTitle("");
    setCategory("Recreação");
    setDefaultDescription("");
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tpl: ActivityTemplate) => {
    setEditingTemplate(tpl);
    setTitle(tpl.title);
    setCategory(tpl.category || "Recreação");
    setDefaultDescription(tpl.default_description);
    setActive(tpl.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título da atividade.");
      return;
    }
    if (!defaultDescription.trim()) {
      toast.error("Informe a descrição pedagógica padrão da atividade.");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await unwrap(saveActivityTemplate({
        id: editingTemplate?.id,
        title: title.trim(),
        category: category.trim(),
        default_description: defaultDescription.trim(),
        active,
      }));

      setTemplates(prev => {
        const exists = prev.some(t => t.id === saved.id);
        const next = exists ? prev.map(t => t.id === saved.id ? saved : t) : [...prev, saved];
        return next.sort((x, y) => x.title.localeCompare(y.title, "pt-BR"));
      });
      setIsModalOpen(false);
      toast.success(editingTemplate ? "Modelo atualizado." : "Modelo criado com sucesso!");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao salvar modelo de atividade."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tpl: ActivityTemplate) => {
    const ok = await confirm({
      title: "Excluir modelo de atividade?",
      message: <>O modelo <strong>{tpl.title}</strong> deixará de aparecer para a equipe. Registros já publicados não são afetados.</>,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      await unwrap(deleteActivityTemplate(tpl.id));
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
      toast.success("Modelo excluído.");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao excluir modelo de atividade."));
    }
  };

  const handleToggleStatus = async (tpl: ActivityTemplate) => {
    try {
      const updated = await unwrap(saveActivityTemplate({ ...tpl, active: !tpl.active }));
      setTemplates(prev => prev.map(t => t.id === tpl.id ? updated : t));
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao alterar o status do modelo."));
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.default_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Modelos de Atividades</h1>
            <span className="bg-brand-pink/15 text-brand-pink-ink text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Catálogo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Cadastre os textos padrão das atividades. A monitora poderá selecioná-los com 1 clique ao publicar fotos na rotina.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-pink hover:bg-brand-pink-dark text-white shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Modelo de Atividade</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-brand-blue shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              categoryFilter === "all"
                ? "bg-ink text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Todas ({templates.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? "bg-ink text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Modelos */}
      {loading ? (
        <CardGridSkeleton label="Carregando modelos de atividades..." />
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-slate-200 space-y-3">
          <Sparkles className="w-10 h-10 text-brand-pink-ink mx-auto" />
          <h3 className="font-bold text-base text-ink">Nenhum modelo encontrado</h3>
          <p className="text-xs text-ink-soft max-w-sm mx-auto">
            Crie modelos de brincadeiras e enriquecimentos ambientais para padronizar os registros da creche.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between space-y-3 transition-all ${
                tpl.active ? "border-slate-200 hover:border-slate-300" : "border-slate-200 bg-slate-50/50 opacity-70"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue-ink bg-brand-blue/10 px-2 py-0.5 rounded-md">
                      {tpl.category || "Geral"}
                    </span>
                    <h3 className="font-black text-base text-ink mt-1 leading-tight">
                      {tpl.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(tpl)}
                    className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                      tpl.active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-200 text-slate-600"
                    }`}
                    title="Clique para alternar ativo/inativo"
                  >
                    {tpl.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{tpl.active ? "Ativo" : "Inativo"}</span>
                  </button>
                </div>

                <p className="text-xs text-ink-soft leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {tpl.default_description}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(tpl)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tpl)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Criar / Editar Modelo */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        locked={isSaving}
        size="md"
        title={editingTemplate ? "Editar Modelo de Atividade" : "Novo Modelo de Atividade"}
        subtitle="Disponível para a monitora na rotina"
        icon={
          <div className="w-9 h-9 rounded-xl bg-brand-pink/15 text-brand-pink-ink flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
        }
      >
            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">
                  Título da Atividade: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Brincadeira da caça"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-pink"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">Categoria / Objetivo:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-pink"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">
                  Descrição Pedagógica Padrão: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ex: Nossos baixinhos precisavam encontrar uma forma de tirar o petisco de dentro do brinquedo. Essa atividade desenvolve coordenação motora, faro e integração, além de ser muito divertida."
                  value={defaultDescription}
                  onChange={(e) => setDefaultDescription(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-pink leading-relaxed"
                />
                <p className="text-[11px] text-ink-soft">
                  Este texto será preenchido automaticamente quando a monitora selecionar esta atividade na rotina diária.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-ink cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-pink-ink"
                />
                <span>Ativo (disponível para seleção pela equipe)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-pink text-white hover:bg-brand-pink-dark shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isSaving ? "Salvando..." : "Salvar Modelo"}</span>
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
}

