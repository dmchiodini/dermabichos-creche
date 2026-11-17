import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { box: "w-10 h-10 rounded-xl", px: 40 },
  md: { box: "w-11 h-11 rounded-2xl", px: 44 },
  lg: { box: "w-20 h-20 rounded-3xl p-1 shadow-md", px: 80 },
};

/** Logo da Dermabichos (antes repetido como <img> em 7 lugares). */
export function BrandLogo({ size = "sm", className }: { size?: keyof typeof sizes; className?: string }) {
  const s = sizes[size];
  return (
    <div
      className={cn(
        "overflow-hidden bg-white p-0.5 border border-slate-200 shadow-2xs shrink-0",
        s.box,
        className
      )}
    >
      <Image
        src="/icon.svg"
        alt="Dermabichos"
        width={s.px}
        height={s.px}
        priority
        unoptimized
        className="w-full h-full object-contain"
      />
    </div>
  );
}
