import { Globe2, Link2 } from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa6";
import {
  SiDiscord,
  SiFacebook,
  SiGooglemaps,
  SiInstagram,
  SiPinterest,
  SiSnapchat,
  SiSpotify,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiTwitch,
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
  linkedin: FaLinkedinIn,
  whatsapp: SiWhatsapp,
  telegram: SiTelegram,
  threads: SiThreads,
  snapchat: SiSnapchat,
  pinterest: SiPinterest,
  twitch: SiTwitch,
  discord: SiDiscord,
  spotify: SiSpotify,
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
