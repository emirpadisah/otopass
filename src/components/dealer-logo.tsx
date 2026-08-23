import Image from "next/image";
import { cn } from "@/lib/cn";
import { BrandLogo } from "@/components/brand-logo";

export function DealerLogo({
  dealerName,
  logoSrc,
  className,
  priority = false,
}: {
  dealerName: string;
  logoSrc: string | null;
  className?: string;
  priority?: boolean;
}) {
  if (!logoSrc) {
    return (
      <span className={cn("dealer-public-logo-fallback", className)}>
        <BrandLogo size="compact" preload={priority} />
      </span>
    );
  }
  return (
    <span className={cn("dealer-public-logo", className)} role="img" aria-label={`${dealerName} logosu`}>
      <Image
        src={logoSrc}
        alt=""
        fill
        sizes="(max-width: 640px) 130px, 180px"
        unoptimized
        priority={priority}
      />
    </span>
  );
}
