"use client";

import React, { useState } from "react";
import { Pet } from "@/types/database.types";
import { cn } from "@/lib/utils";

interface PetAvatarProps {
  pet: Partial<Pet>;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-9 h-9 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-base",
};

export function PetAvatar({ pet, size = "md" }: PetAvatarProps) {
  // Foto com link quebrado cai para a inicial, em vez do texto alternativo.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (pet.photo_url && failedSrc !== pet.photo_url) {
    const src = pet.photo_url;
    return (
      <div className={cn("relative rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200", sizeClasses[size])}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={pet.name || "Pet"}
          onError={() => setFailedSrc(src)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback com inicial e gradiente da marca
  const initial = pet.name ? pet.name.charAt(0).toUpperCase() : "P";

  return (
    <div
      aria-hidden
      className={cn(
        "relative rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 bg-linear-to-tr from-brand-pink to-brand-blue",
        sizeClasses[size]
      )}
    >
      {initial}
    </div>
  );
}
