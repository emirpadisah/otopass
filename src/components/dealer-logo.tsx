import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/cn";

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
  if (!logoSrc) return <BrandLogo className={className} size="compact" preload={priority} />;
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
