import React from "react";
import { Dog } from "lucide-react";
import { Pet } from "@/types/database.types";

interface PetAvatarProps {
  pet: Partial<Pet>;
  size?: "sm" | "md" | "lg";
}

export function PetAvatar({ pet, size = "md" }: PetAvatarProps) {
  const sizeClasses = {
    sm: "w-9 h-9 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-base",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  if (pet.photo_url) {
    return (
      <div className={`relative rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 ${sizeClasses[size]}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pet.photo_url}
          alt={pet.name || "Pet"}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback com inicial e gradiente da marca
  const initial = pet.name ? pet.name.charAt(0).toUpperCase() : "P";

  return (
    <div
      className={`relative rounded-xl flex items-center justify-center font-bold text-white shadow-xs flex-shrink-0 bg-gradient-to-tr from-[#CD8DA7] to-[#79B7DE] ${sizeClasses[size]}`}
    >
      {initial}
    </div>
  );
}

