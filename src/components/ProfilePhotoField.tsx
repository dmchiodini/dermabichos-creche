"use client";

import React, { useId, useRef, useState } from "react";
import { Camera, Dog, Loader2, Trash2, UserRound } from "lucide-react";
import { compressImage } from "@/lib/image-utils";
import { useFeedback } from "@/components/ui/Feedback";

/** Foto de perfil: 800px bastam para o avatar e mantêm o arquivo em ~60–120 KB. */
const PROFILE_MAX_DIMENSION = 800;

interface ProfilePhotoFieldProps {
  /** URL atual (Storage/link) ou data-URL recém-escolhida. */
  photoUrl: string | null | undefined;
  /** Nome usado nos textos acessíveis (ex.: "Thor", "Ana Paula"). */
  name?: string;
  /** Ícone exibido sem foto: cachorro (pet) ou pessoa (equipe). */
  kind?: "pet" | "person";
  disabled?: boolean;
  onChange: (photoUrl: string | null) => void;
}

/**
 * Foto de perfil (pet ou equipe) no estilo "avatar editável": a própria foto abre o
 * seletor (computador, câmera ou galeria do celular); um ícone de câmera indica
 * a troca e um ícone de lixeira remove. A imagem é comprimida no navegador.
 */
export function ProfilePhotoField({ photoUrl, name, kind = "pet", disabled, onChange }: ProfilePhotoFieldProps) {
  const { toast } = useFeedback();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const photo = photoUrl || null;
  const broken = !!photo && failedSrc === photo;
  const busy = disabled || processing;
  const displayName = name?.trim() || (kind === "pet" ? "o pet" : "a pessoa");
  const PlaceholderIcon = kind === "pet" ? Dog : UserRound;

  const pick = () => {
    if (!busy) inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    try {
      setProcessing(true);
      onChange(await compressImage(file, PROFILE_MAX_DIMENSION));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível carregar a foto.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        Foto (opcional)
      </label>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            aria-label={photo ? `Trocar foto de ${displayName}` : `Adicionar foto de ${displayName}`}
            className={`group w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default ${
              photo && !broken
                ? "bg-brand-blue-light"
                : "border-2 border-dashed border-[#cfd5e0] bg-paper hover:border-brand-pink hover:bg-brand-pink-light"
            }`}
          >
            {processing ? (
              <Loader2 className="w-6 h-6 text-brand-pink-ink animate-spin" />
            ) : photo && !broken ? (
              // eslint-disable-next-line @next/next/no-img-element -- data-URL local ou Storage
              <img
                src={photo}
                alt=""
                onError={() => setFailedSrc(photo)}
                className="w-full h-full object-cover transition-opacity group-hover:opacity-85"
              />
            ) : (
              <span className="flex flex-col items-center gap-1 text-ink-soft group-hover:text-brand-pink-ink">
                <PlaceholderIcon className="w-7 h-7" />
                <span className="text-xs font-bold">
                  {broken ? "Indisponível" : "Adicionar"}
                </span>
              </span>
            )}
          </button>

          {/* Ícone de câmera: indica que a foto é editável */}
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            tabIndex={-1}
            aria-hidden
            className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-brand-pink text-ink ring-[3px] ring-white shadow-sm flex items-center justify-center hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
          </button>

          {photo && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              aria-label="Remover foto"
              title="Remover foto"
              className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-white text-rose-700 border border-line shadow-sm flex items-center justify-center hover:bg-rose-50 disabled:opacity-60 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold text-ink">
            {broken
              ? "Não foi possível carregar a foto atual"
              : photo
                ? "Toque na foto para trocar"
                : "Toque para adicionar uma foto"}
          </p>
          <p className="text-xs text-ink-soft leading-snug">
            JPG, PNG ou WebP. No celular, abre a câmera ou a galeria.
          </p>
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFile}
          disabled={busy}
        />
      </div>
    </div>
  );
}
