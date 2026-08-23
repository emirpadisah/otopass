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
      aria-label="otoköprü"
    >
      <span className="brand-lockup-mark" aria-hidden="true">
        <Image
          className="brand-lockup-image"
          src="/images/otokopru-logo.png"
          alt=""
          width={559}
          height={272}
          loading={preload ? "eager" : "lazy"}
          fetchPriority={preload ? "high" : "auto"}
          sizes={size === "display" ? "(max-width: 640px) 46vw, 180px" : "96px"}
        />
      </span>
      <span className="brand-lockup-name" aria-hidden="true">otoköprü</span>
    </span>
  );
}
