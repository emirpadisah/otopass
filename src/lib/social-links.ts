import type { Json } from "@/lib/supabase/database.types";

export const SOCIAL_PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram", placeholder: "https://instagram.com/galeri" },
  { value: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@galeri" },
  { value: "facebook", label: "Facebook", placeholder: "https://facebook.com/galeri" },
  { value: "x", label: "X", placeholder: "https://x.com/galeri" },
  { value: "youtube", label: "YouTube", placeholder: "https://youtube.com/@galeri" },
  { value: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/905xxxxxxxxx" },
  { value: "telegram", label: "Telegram", placeholder: "https://t.me/galeri" },
  { value: "threads", label: "Threads", placeholder: "https://threads.net/@galeri" },
  { value: "snapchat", label: "Snapchat", placeholder: "https://snapchat.com/add/galeri" },
  { value: "google_business", label: "Google İşletme", placeholder: "https://maps.app.goo.gl/..." },
  { value: "website", label: "Web sitesi", placeholder: "https://galeri.com" },
  { value: "other", label: "Diğer bağlantı", placeholder: "https://..." },
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORM_OPTIONS)[number]["value"];

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
  label?: string;
};

export const MAX_SOCIAL_LINKS = 12;

const PLATFORM_HOSTS: Partial<Record<SocialPlatform, readonly string[]>> = {
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  facebook: ["facebook.com", "fb.com", "fb.me"],
  x: ["x.com", "twitter.com"],
  youtube: ["youtube.com", "youtu.be"],
  whatsapp: ["wa.me", "whatsapp.com"],
  telegram: ["t.me", "telegram.me"],
  threads: ["threads.net"],
  snapchat: ["snapchat.com"],
  google_business: ["google.com", "goo.gl"],
};

const PLATFORM_VALUES = new Set<string>(SOCIAL_PLATFORM_OPTIONS.map((option) => option.value));

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return typeof value === "string" && PLATFORM_VALUES.has(value);
}

export function getSocialPlatformOption(platform: SocialPlatform) {
  return SOCIAL_PLATFORM_OPTIONS.find((option) => option.value === platform) ?? SOCIAL_PLATFORM_OPTIONS.at(-1)!;
}

export function getSocialLinkLabel(link: SocialLink): string {
  if (link.platform === "other" && link.label?.trim()) return link.label.trim();
  return getSocialPlatformOption(link.platform).label;
}

function hostMatches(host: string, allowedHost: string): boolean {
  return host === allowedHost || host.endsWith(`.${allowedHost}`);
}

export function normalizeSocialLink(link: SocialLink): SocialLink {
  const rawUrl = link.url.trim();
  if (!rawUrl) throw new Error("Her sosyal bağlantı için bir adres girin.");
  if (rawUrl.length > 300) throw new Error("Sosyal bağlantılar en fazla 300 karakter olabilir.");

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    throw new Error("Geçerli bir sosyal medya bağlantısı girin.");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Sosyal bağlantılar güvenli bir HTTPS adresi olmalıdır.");
  }

  const allowedHosts = PLATFORM_HOSTS[link.platform];
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (allowedHosts && !allowedHosts.some((allowedHost) => hostMatches(host, allowedHost))) {
    throw new Error(`${getSocialPlatformOption(link.platform).label} için doğru platform bağlantısını girin.`);
  }

  const label = link.label?.trim();
  if (link.platform === "other" && !label) {
    throw new Error("Diğer bağlantı için görünecek bir ad girin.");
  }
  if (label && label.length > 40) {
    throw new Error("Bağlantı adı en fazla 40 karakter olabilir.");
  }

  return {
    platform: link.platform,
    url: url.toString().replace(/\/$/, ""),
    ...(link.platform === "other" ? { label } : {}),
  };
}

function parseLinkRecord(value: unknown): SocialLink | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!isSocialPlatform(record.platform) || typeof record.url !== "string") return null;

  try {
    return normalizeSocialLink({
      platform: record.platform,
      url: record.url,
      ...(typeof record.label === "string" ? { label: record.label } : {}),
    });
  } catch {
    return null;
  }
}

export function parseSocialLinksInput(value: FormDataEntryValue | null): SocialLink[] {
  const raw = String(value ?? "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Sosyal bağlantı listesi okunamadı.");
  }

  if (!Array.isArray(parsed)) throw new Error("Sosyal bağlantı listesi geçersiz.");
  if (parsed.length > MAX_SOCIAL_LINKS) {
    throw new Error(`En fazla ${MAX_SOCIAL_LINKS} sosyal bağlantı ekleyebilirsiniz.`);
  }

  const links = parsed.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Sosyal bağlantı bilgisi geçersiz.");
    }
    const record = item as Record<string, unknown>;
    if (!isSocialPlatform(record.platform) || typeof record.url !== "string") {
      throw new Error("Sosyal bağlantı bilgisi geçersiz.");
    }
    return normalizeSocialLink({
      platform: record.platform,
      url: record.url,
      ...(typeof record.label === "string" ? { label: record.label } : {}),
    });
  });

  const usedPlatforms = new Set<SocialPlatform>();
  for (const link of links) {
    if (link.platform !== "other" && usedPlatforms.has(link.platform)) {
      throw new Error(`${getSocialPlatformOption(link.platform).label} yalnızca bir kez eklenebilir.`);
    }
    usedPlatforms.add(link.platform);
  }

  return links;
}

export function getDealerSocialLinks(dealer: { social_links?: Json | null } | null): SocialLink[] {
  if (!dealer || !Array.isArray(dealer.social_links)) return [];
  return dealer.social_links
    .map(parseLinkRecord)
    .filter((link): link is SocialLink => Boolean(link))
    .slice(0, MAX_SOCIAL_LINKS);
}
