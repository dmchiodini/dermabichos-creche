"use client";

import React, { useState } from "react";
import { Camera, Trash2, Plus } from "lucide-react";
import { DailyPhoto } from "@/types/database.types";

interface PhotoUploaderProps {
  photos: DailyPhoto[];
  onAddPhoto: (url: string, caption?: string) => Promise<void>;
  onRemovePhoto: (photoId: string) => Promise<void>;
  maxPhotos?: number;
}

export function PhotoUploader({
  photos,
  onAddPhoto,
  onRemovePhoto,
  maxPhotos = 5,
}: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const canAddMore = photos.length < maxPhotos;
  const remainingSlots = Math.max(0, maxPhotos - photos.length);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canAddMore) {
      alert(`Limite máximo de ${maxPhotos} fotos atingido para este dia.`);
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      try {
        await onAddPhoto(dataUrl, "Momento na creche");
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao anexar foto");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-brand-pink-ink" />
          <span>Fotos da Rotina</span>
        </label>
        <span className="text-[11px] font-bold bg-brand-pink/15 text-brand-pink-ink px-2 py-0.5 rounded-full">
          {photos.length} de {maxPhotos} fotos
        </span>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo.id || index}
            className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-2xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.storage_url || photo.file_path}
              alt={photo.caption || "Foto da rotina"}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemovePhoto(photo.id)}
              className="absolute top-1 right-1 w-6 h-6 bg-white/90 hover:bg-rose-500 hover:text-white rounded-lg text-rose-600 shadow-xs flex items-center justify-center transition-colors cursor-pointer"
              title="Remover foto"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Add photo button */}
        {canAddMore && (
          <div className="border-2 border-dashed border-brand-blue/40 hover:border-brand-blue rounded-xl flex flex-col items-center justify-center p-2 text-center aspect-square bg-slate-50/80 transition-colors relative cursor-pointer">
            <label className="cursor-pointer flex flex-col items-center gap-1 w-full h-full justify-center">
              <div className="w-8 h-8 rounded-full bg-white shadow-2xs flex items-center justify-center text-brand-blue-ink">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-ink">
                {isUploading ? "Enviando..." : "Adicionar"}
              </span>
              <span className="text-[10px] text-ink-soft">
                (Até {remainingSlots})
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
