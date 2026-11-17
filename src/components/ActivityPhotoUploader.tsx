"use client";

import React, { useState } from "react";
import { Camera, Trash2, Plus, Loader2 } from "lucide-react";
import { DailyActivityPhoto } from "@/types/database.types";
import { compressImage } from "@/lib/image-utils";
import { errorMessage } from "@/lib/action-result";
import { useFeedback } from "@/components/ui/Feedback";

interface ActivityPhotoUploaderProps {
  photos: DailyActivityPhoto[];
  onAddPhoto: (url: string, caption?: string) => Promise<void>;
  onRemovePhoto: (photoId: string) => Promise<void>;
  maxPhotos?: number;
}

export function ActivityPhotoUploader({
  photos,
  onAddPhoto,
  onRemovePhoto,
  maxPhotos = 10,
}: ActivityPhotoUploaderProps) {
  const { toast } = useFeedback();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isUploading = progress !== null;
  const canAddMore = photos.length < maxPhotos;
  const remainingSlots = Math.max(0, maxPhotos - photos.length);

  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    input.value = "";
    if (files.length === 0) return;

    if (files.length > remainingSlots) {
      toast.info(`Limite de ${maxPhotos} fotos: serão enviadas apenas as primeiras ${remainingSlots}.`);
    }
    const selected = files.slice(0, remainingSlots);

    setProgress({ done: 0, total: selected.length });
    let failures = 0;
    try {
      for (let i = 0; i < selected.length; i++) {
        try {
          // Comprime no próprio celular antes de enviar (≈ 10–20× menor).
          const dataUrl = await compressImage(selected[i]);
          await onAddPhoto(dataUrl, `Foto ${photos.length + i + 1}`);
        } catch (err) {
          failures++;
          toast.error(errorMessage(err, "Erro ao anexar foto."));
        }
        setProgress({ done: i + 1, total: selected.length });
      }
    } finally {
      setProgress(null);
    }
    if (failures === 0 && selected.length > 1) toast.success(`${selected.length} fotos anexadas.`);
  };

  const handleRemove = async (photoId: string) => {
    setRemovingId(photoId);
    try {
      await onRemovePhoto(photoId);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao remover foto."));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-brand-pink-ink shrink-0" />
            <span>Fotos da Atividade</span>
          </span>

          <span className="text-[11px] font-bold bg-brand-pink/15 text-brand-pink-ink px-2.5 py-0.5 rounded-full shrink-0">
            {photos.length} de {maxPhotos} fotos
          </span>
        </div>

        <p className="text-[11px] text-ink-soft leading-snug">
          Selecione fotos da câmera ou galeria do celular. Elas são otimizadas automaticamente antes do envio.
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo.id || index}
            className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-2xs animate-pop-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.storage_url || photo.file_path}
              alt={photo.caption || `Foto ${index + 1}`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded font-bold">
              #{index + 1}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(photo.id)}
              disabled={removingId === photo.id || isUploading}
              className="absolute top-1 right-1 w-7 h-7 bg-white/95 hover:bg-rose-500 hover:text-white rounded-lg text-rose-600 shadow-xs flex items-center justify-center transition-colors cursor-pointer disabled:opacity-60"
              aria-label={`Remover foto ${index + 1}`}
            >
              {removingId === photo.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}

        {isUploading &&
          Array.from({ length: progress.total - progress.done }).map((_, i) => (
            <div
              key={`pending-${i}`}
              className="rounded-xl aspect-square bg-slate-100 border border-slate-200 animate-pulse flex items-center justify-center"
              aria-hidden
            >
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ))}

        {canAddMore && !isUploading && (
          <label className="border-2 border-dashed border-brand-blue/40 hover:border-brand-blue active:bg-brand-blue/10 rounded-xl flex flex-col items-center justify-center gap-1 p-2 text-center aspect-square bg-slate-50/80 transition-all cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-white shadow-2xs flex items-center justify-center text-brand-blue-ink">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-ink leading-tight">Adicionar</span>
            <span className="text-[10px] text-ink-soft">(Até {remainingSlots})</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={handleMultipleFilesUpload}
              className="sr-only"
              aria-label={`Adicionar fotos (restam ${remainingSlots})`}
            />
          </label>
        )}
      </div>

      {isUploading && (
        <p role="status" className="text-[11px] font-semibold text-brand-blue-ink flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Enviando fotos... {progress.done} de {progress.total}
        </p>
      )}
    </div>
  );
}
