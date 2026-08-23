import {
  AtSign,
  AudioLines,
  Facebook,
  Ghost,
  Globe2,
  Instagram,
  Link2,
  Linkedin,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Music2,
  Pin,
  Send,
  Twitch,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { SocialPlatform } from "@/lib/social-links";

const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  instagram: Instagram,
  tiktok: Music2,
  facebook: Facebook,
  x: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
  telegram: Send,
  threads: AtSign,
  snapchat: Ghost,
  pinterest: Pin,
  twitch: Twitch,
  discord: MessagesSquare,
  spotify: AudioLines,
  google_business: MapPin,
  website: Globe2,
  other: Link2,
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
  const Icon = SOCIAL_ICONS[platform];
  return <Icon size={size} className={className} aria-hidden="true" />;
}
