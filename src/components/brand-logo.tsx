import Image from "next/image";
import { cn } from "@/lib/cn";

type BrandLogoProps = {
  className?: string;
  preload?: boolean;
  size?: "compact" | "navigation" | "display";
};

export function BrandLogo({ className, preload = false, size = "navigation" }: BrandLogoProps) {
  return (
    <span
      className={cn("brand-lockup", className)}
      data-size={size}
      role="img"
      aria-label="POL-CAR"
    >
      <Image
        className="brand-lockup-image"
        src="/images/pol-car-logo.jpg"
        alt=""
        width={1254}
        height={1254}
        loading={preload ? "eager" : "lazy"}
        fetchPriority={preload ? "high" : "auto"}
        sizes={size === "display" ? "(max-width: 640px) 72vw, 320px" : "180px"}
      />
    </span>
  );
}
