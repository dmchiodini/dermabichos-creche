import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { box: "w-10 h-10", px: 40 },
  md: { box: "w-12 h-12", px: 48 },
  lg: { box: "w-20 h-20", px: 80 },
  xl: { box: "w-28 h-28 sm:w-32 sm:h-32", px: 128 },
};

/** Logo da Dermabichos: o selo é circular, então o contêiner também é. */
export function BrandLogo({ size = "sm", className }: { size?: keyof typeof sizes; className?: string }) {
  const s = sizes[size];
  return (
    <div className={cn("rounded-full overflow-hidden bg-white ring-1 ring-line shrink-0", s.box, className)}>
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
