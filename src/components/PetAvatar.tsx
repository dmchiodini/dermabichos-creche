"use client";

import React, { useState } from "react";
import { Pet } from "@/types/database.types";
import { cn } from "@/lib/utils";

interface PetAvatarProps {
  pet: Partial<Pet>;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  xs: "w-6 h-6 text-[11px] rounded-full",
  sm: "w-9 h-9 text-sm rounded-xl",
  md: "w-12 h-12 text-lg rounded-2xl",
  lg: "w-16 h-16 text-2xl rounded-2xl",
  xl: "w-24 h-24 sm:w-28 sm:h-28 text-4xl rounded-[1.75rem]",
};

export function PetAvatar({ pet, size = "md" }: PetAvatarProps) {
  // Foto com link quebrado cai para a inicial, em vez do texto alternativo.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (pet.photo_url && failedSrc !== pet.photo_url) {
    const src = pet.photo_url;
    return (
      <div className={cn("relative overflow-hidden bg-brand-blue-light shrink-0", sizeClasses[size])}>
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

  // Sem foto: inicial em tinta sobre o rosa da marca
  const initial = pet.name ? pet.name.charAt(0).toUpperCase() : "P";

  return (
    <div
      aria-hidden
      className={cn(
        "relative flex items-center justify-center font-display font-extrabold text-ink shrink-0 bg-brand-pink",
        sizeClasses[size]
      )}
    >
      {initial}
    </div>
  );
}
