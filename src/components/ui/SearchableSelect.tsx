"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { normalizeSearch } from "@/lib/dog-breeds";

interface SearchableSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

/**
 * Select com campo de busca (combobox acessível): teclado (↑ ↓ Enter Esc),
 * busca sem acentos e valor atual preservado mesmo se não estiver na lista.
 */
export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Digite para buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  disabled,
}: SearchableSelectProps) {
  const id = useId();
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  // Cadastros antigos podem ter uma raça fora da lista: mantém visível como opção.
  const allOptions = useMemo(
    () => (value && !options.includes(value) ? [value, ...options] : options),
    [value, options]
  );

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return q ? allOptions.filter((o) => normalizeSearch(o).includes(q)) : allOptions;
  }, [allOptions, query]);

  const openList = () => {
    if (disabled) return;
    setQuery("");
    setActive(Math.max(0, allOptions.indexOf(value)));
    setOpen(true);
  };

  const close = () => setOpen(false);

  const select = (option: string) => {
    onChange(option);
    close();
  };

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    searchRef.current?.focus();
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Mantém a opção ativa visível ao navegar pelo teclado.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault(); // não envia o formulário
      if (filtered[active]) select(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // fecha só a lista, não o modal
      close();
    } else if (e.key === "Tab") {
      close();
    }
  };

  return (
    <div ref={rootRef} className="relative space-y-1">
      <label htmlFor={`${id}-trigger`} className="font-bold text-ink">
        {label}
      </label>

      <button
        id={`${id}-trigger`}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="w-full flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left disabled:opacity-60 cursor-pointer"
      >
        <span className={`truncate ${value ? "text-ink" : "text-slate-400"}`}>{value || placeholder}</span>
        <span className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Limpar seleção"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-fade-in">
          <div className="relative border-b border-slate-100">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={filtered[active] ? `${id}-opt-${active}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2.5 bg-transparent outline-none"
            />
          </div>

          <ul ref={listRef} id={listId} role="listbox" aria-label={label} className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-ink-soft">{emptyMessage}</li>
            ) : (
              filtered.map((option, index) => {
                const selected = option === value;
                return (
                  <li
                    key={option}
                    id={`${id}-opt-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={selected}
                    onPointerEnter={() => setActive(index)}
                    onClick={() => select(option)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer ${
                      index === active ? "bg-brand-blue/10" : ""
                    } ${selected ? "font-bold text-brand-blue-ink" : "text-ink"}`}
                  >
                    <span>{option}</span>
                    {selected && <Check className="w-4 h-4 shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
