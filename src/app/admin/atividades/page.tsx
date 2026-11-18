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
import { normalizeSearch } from "@/lib/dog-breeds";
import { PageShell, PageHeader, SearchField, EmptyState } from "@/components/ui/Page";
import {
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  Check,
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
      toast.success(editingTemplate ? "Atividade atualizada." : "Atividade criada.");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao salvar modelo de atividade."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tpl: ActivityTemplate) => {
    const ok = await confirm({
      title: "Excluir esta atividade?",
      message: <><strong>{tpl.title}</strong> deixará de aparecer para a equipe. Registros já publicados não são afetados.</>,
      confirmLabel: "Excluir atividade",
      danger: true,
    });
    if (!ok) return;
    try {
      await unwrap(deleteActivityTemplate(tpl.id));
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
      toast.success("Atividade excluída.");
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

  // Busca única: título, descrição ou categoria (sem diferenciar acentos/maiúsculas).
  const query = normalizeSearch(searchTerm);
  const filteredTemplates = query
    ? templates.filter(t => normalizeSearch(`${t.title} ${t.default_description} ${t.category || ""}`).includes(query))
    : templates;

  return (
    <PageShell>
      <PageHeader
        title="Atividades"
        count={templates.length}
        description="Textos prontos que a monitora escolhe com um toque ao publicar as fotos do dia."
        actions={
          <button type="button" onClick={handleOpenNew} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Nova atividade
          </button>
        }
      />

      <SearchField
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar por título, descrição ou categoria"
        label="Buscar atividades"
      />

      {loading ? (
        <CardGridSkeleton label="Carregando atividades..." />
      ) : filteredTemplates.length === 0 ? (
        query ? (
          <EmptyState icon={<Sparkles className="w-6 h-6" />} title="Nenhuma atividade encontrada">
            Tente outra palavra ou limpe a busca.
          </EmptyState>
        ) : (
          <EmptyState
            icon={<Sparkles className="w-6 h-6" />}
            title="Nenhuma atividade cadastrada"
            action={
              <button type="button" onClick={handleOpenNew} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Nova atividade
              </button>
            }
          >
            Cadastre brincadeiras e enriquecimentos para padronizar os registros da creche.
          </EmptyState>
        )
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => (
            <li key={tpl.id} className={`panel p-5 flex flex-col gap-3 ${tpl.active ? "" : "bg-paper!"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-brand-blue-ink">{tpl.category || "Geral"}</p>
                  <h2 className={`text-lg font-bold leading-tight mt-0.5 ${tpl.active ? "text-ink" : "text-ink-soft"}`}>
                    {tpl.title}
                  </h2>
                </div>

                {/* Interruptor: disponível ou não para a equipe */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={tpl.active}
                  aria-label={`Disponível para a equipe: ${tpl.title}`}
                  onClick={() => handleToggleStatus(tpl)}
                  className="shrink-0 flex items-center gap-2 text-xs font-bold text-ink-soft cursor-pointer rounded-full"
                >
                  {tpl.active ? "Ativa" : "Inativa"}
                  <span
                    aria-hidden
                    className={`relative w-10 h-6 rounded-full transition-colors ${tpl.active ? "bg-brand-pink" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-[left] ${tpl.active ? "left-5" : "left-1"}`}
                    />
                  </span>
                </button>
              </div>

              <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap line-clamp-5">
                {tpl.default_description}
              </p>

              <div className="mt-auto flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => handleDelete(tpl)}
                  aria-label={`Excluir ${tpl.title}`}
                  className="btn btn-sm btn-ghost text-rose-700!"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(tpl)}
                  aria-label={`Editar ${tpl.title}`}
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

      {/* Modal para Criar / Editar Modelo */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        locked={isSaving}
        size="md"
        title={editingTemplate ? "Editar atividade" : "Nova atividade"}
        subtitle="Aparece como sugestão para a monitora"
        icon={
          <div className="w-10 h-10 rounded-xl bg-brand-pink-light text-brand-pink-ink flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        }
      >
        <form onSubmit={handleSave} className="px-4 sm:px-6 py-5 space-y-4 text-sm">
          <div>
            <label htmlFor="tpl-title" className="field-label">Título</label>
            <input
              id="tpl-title"
              type="text"
              required
              placeholder="Ex.: Brincadeira da caça"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="tpl-category" className="field-label">Categoria</label>
            <select id="tpl-category" value={category} onChange={(e) => setCategory(e.target.value)} className="field">
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tpl-description" className="field-label">Descrição para os responsáveis</label>
            <textarea
              id="tpl-description"
              rows={5}
              required
              placeholder="Ex.: Nossos baixinhos precisavam tirar o petisco de dentro do brinquedo. A atividade desenvolve coordenação motora, faro e integração."
              value={defaultDescription}
              onChange={(e) => setDefaultDescription(e.target.value)}
              className="field leading-relaxed"
            />
            <p className="field-hint">Preenchida automaticamente quando a monitora escolhe esta atividade. Ela pode ajustar antes de publicar.</p>
          </div>

          <label className="flex items-center gap-2.5 text-sm font-bold text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4.5 h-4.5 rounded accent-brand-pink-ink"
            />
            Disponível para a equipe
          </label>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-line">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSaving ? "Salvando..." : editingTemplate ? "Salvar alterações" : "Criar atividade"}
            </button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
