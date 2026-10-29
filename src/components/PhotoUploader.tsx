"use client";

import React, { useState } from "react";
import { Camera, Trash2, AlertTriangle, Plus, Image as ImageIcon } from "lucide-react";
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
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [captionInput, setCaptionInput] = useState("");
  const [showInputModal, setShowInputModal] = useState(false);

  const canAddMore = photos.length < maxPhotos;

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
        await onAddPhoto(dataUrl, captionInput || "Momento na creche");
        setCaptionInput("");
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao anexar foto");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualAddUrl = async () => {
    if (!photoUrlInput.trim()) return;
    if (!canAddMore) {
      alert(`Limite máximo de ${maxPhotos} fotos atingido.`);
      return;
    }

    setIsUploading(true);
    try {
      await onAddPhoto(photoUrlInput.trim(), captionInput || "Momento na creche");
      setPhotoUrlInput("");
      setCaptionInput("");
      setShowInputModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao adicionar foto");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-[#25313B] flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-[#CD8DA7]" />
          <span>Fotos do Dia</span>
          <span className="text-xs font-normal text-[#5B6570] bg-slate-100 px-2 py-0.5 rounded-full">
            {photos.length} de {maxPhotos}
          </span>
        </label>
        
        {/* Retention reminder badge */}
        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          Retenção: 7 dias
        </span>
      </div>

      {/* Notice box */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-xs text-amber-900 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Atenção:</strong> As fotos são temporárias para acompanhamento diário dos tutores e são excluídas automaticamente após <strong>7 dias</strong>. O histórico textual do relatório permanece intacto.
        </p>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 text-white text-[11px] truncate">
                {photo.caption}
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemovePhoto(photo.id)}
              className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 hover:bg-rose-500 hover:text-white rounded-lg text-rose-600 shadow-xs transition-colors"
              title="Remover foto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Add photo button / upload tile */}
        {canAddMore && (
          <div className="border-2 border-dashed border-slate-300 hover:border-[#79B7DE] rounded-xl flex flex-col items-center justify-center p-3 text-center aspect-square bg-slate-50/50 hover:bg-[#79B7DE]/5 transition-colors relative">
            <label className="cursor-pointer flex flex-col items-center gap-1.5 w-full h-full justify-center">
              <div className="w-10 h-10 rounded-full bg-white shadow-2xs flex items-center justify-center text-[#79B7DE]">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#25313B]">Adicionar Foto</span>
              <span className="text-[10px] text-[#5B6570]">Tirar foto ou galeria</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowInputModal(true)}
              className="text-[10px] text-[#79B7DE] hover:underline mt-1"
            >
              Ou colar link da foto
            </button>
          </div>
        )}
      </div>

      {/* Modal / Popover para colar link */}
      {showInputModal && (
        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2 mt-2">
          <p className="text-xs font-semibold text-[#25313B]">Inserir link da foto:</p>
          <input
            type="url"
            value={photoUrlInput}
            onChange={(e) => setPhotoUrlInput(e.target.value)}
            placeholder="https://exemplo.com/foto-do-pet.jpg"
            className="w-full text-xs p-2 border border-slate-200 rounded-md focus:border-[#79B7DE]"
          />
          <input
            type="text"
            value={captionInput}
            onChange={(e) => setCaptionInput(e.target.value)}
            placeholder="Legenda opcional (ex: Brincando no jardim)"
            className="w-full text-xs p-2 border border-slate-200 rounded-md focus:border-[#79B7DE]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowInputModal(false)}
              className="text-xs px-2.5 py-1 text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleManualAddUrl}
              disabled={isUploading || !photoUrlInput.trim()}
              className="text-xs px-3 py-1 bg-[#79B7DE] text-white rounded-md font-medium hover:bg-[#5ea4d0]"
            >
              {isUploading ? "Salvando..." : "Anexar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
