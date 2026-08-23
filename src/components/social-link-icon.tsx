import { Globe2, Link2 } from "lucide-react";
import {
  SiFacebook,
  SiGooglemaps,
  SiInstagram,
  SiSnapchat,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "react-icons/si";
import type { IconType } from "react-icons";
import type { SocialPlatform } from "@/lib/social-links";

const SOCIAL_BRAND_ICONS: Partial<Record<SocialPlatform, IconType>> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  facebook: SiFacebook,
  x: SiX,
  youtube: SiYoutube,
  whatsapp: SiWhatsapp,
  telegram: SiTelegram,
  threads: SiThreads,
  snapchat: SiSnapchat,
  google_business: SiGooglemaps,
};

export function SocialLinkIcon({
  platform,
  size = 16,
  className,
}: {
  platform: SocialPlatform;
  size?: number;
  className?: string;
}) {
  const BrandIcon = SOCIAL_BRAND_ICONS[platform];
  if (BrandIcon) return <BrandIcon size={size} className={className} aria-hidden="true" />;

  const GenericIcon = platform === "website" ? Globe2 : Link2;
  return <GenericIcon size={size} className={className} aria-hidden="true" />;
}
