"use client";

import React, { useId, useRef, useState } from "react";
import { Camera, Dog, Loader2, Trash2 } from "lucide-react";
import { Pet } from "@/types/database.types";
import { compressImage } from "@/lib/image-utils";
import { useFeedback } from "@/components/ui/Feedback";

/** Foto de perfil: 800px bastam para o avatar e mantêm o arquivo em ~60–120 KB. */
const PROFILE_MAX_DIMENSION = 800;

interface PetPhotoFieldProps {
  pet: Partial<Pet>;
  disabled?: boolean;
  onChange: (photoUrl: string | null) => void;
}

/**
 * Campo de foto de perfil do pet: escolhe do computador ou tira com a câmera do
 * celular. A imagem é comprimida no navegador e enviada ao Storage ao salvar.
 */
export function PetPhotoField({ pet, disabled, onChange }: PetPhotoFieldProps) {
  const { toast } = useFeedback();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const photo = pet.photo_url || null;
  const busy = disabled || processing;

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
    <div className="space-y-1">
      <label htmlFor={inputId} className="font-bold text-ink">
        Foto de Perfil (Opcional)
      </label>
      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-brand-pink/10 border border-slate-200 flex items-center justify-center">
          {processing ? (
            <Loader2 className="w-6 h-6 text-brand-pink-ink animate-spin" />
          ) : photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data-URL local ou Storage
            <img src={photo} alt={`Foto de ${pet.name || "pet"}`} className="w-full h-full object-cover" />
          ) : (
            <Dog className="w-8 h-8 text-brand-pink-ink/60" />
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFile}
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-pink-ink text-white font-bold text-xs hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            {photo ? "Trocar foto" : "Enviar foto"}
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 font-semibold text-xs hover:bg-rose-50 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </button>
          )}
          <p className="text-[11px] text-ink-soft">JPG, PNG ou WebP. No celular, abre a câmera ou a galeria.</p>
        </div>
      </div>
    </div>
  );
}
