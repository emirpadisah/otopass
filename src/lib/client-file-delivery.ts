export type MobilePlatform = "ios" | "android" | "other";

type PlatformIdentity = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
};

export function detectMobilePlatform(identity: PlatformIdentity): MobilePlatform {
  if (/iPad|iPhone|iPod/i.test(identity.userAgent)) {
    return "ios";
  }

  // iPadOS can identify itself as a desktop-class Mac browser.
  if (/Mac/i.test(identity.platform) && identity.maxTouchPoints > 1) {
    return "ios";
  }

  if (/Android/i.test(identity.userAgent)) {
    return "android";
  }

  return "other";
}

export function getCurrentMobilePlatform(): MobilePlatform {
  return detectMobilePlatform({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
}
