"use client";

import { Cookie, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

const CONSENT_STORAGE_KEY = "otopass-google-consent-v1";
const CONSENT_PREFERENCES_EVENT = "otopass:open-consent-preferences";

type ConsentChoice = "granted" | "denied";
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

function isMeasurementRoute(pathname: string) {
  return !pathname.startsWith("/admin") && !pathname.startsWith("/dealer");
}

function updateGoogleConsent(choice: ConsentChoice, analyticsEnabled: boolean, adsEnabled: boolean) {
  window.gtag?.("consent", "update", {
    ad_storage: choice === "granted" && adsEnabled ? "granted" : "denied",
    ad_user_data: choice === "granted" && adsEnabled ? "granted" : "denied",
    ad_personalization: choice === "granted" && adsEnabled ? "granted" : "denied",
    analytics_storage: choice === "granted" && analyticsEnabled ? "granted" : "denied",
  });
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener(CONSENT_PREFERENCES_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_PREFERENCES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getConsentSnapshot(): ConsentChoice | null {
  const storedChoice = localStorage.getItem(CONSENT_STORAGE_KEY);
  return storedChoice === "granted" || storedChoice === "denied" ? storedChoice : null;
}

function getServerConsentSnapshot(): undefined {
  return undefined;
}

export function GoogleMeasurement({
  analyticsId,
  adsId,
  nonce,
  privacyHref,
}: {
  analyticsId: string | null;
  adsId: string | null;
  nonce?: string;
  privacyHref: string;
}) {
  const pathname = usePathname();
  const choice = useSyncExternalStore<ConsentChoice | null | undefined>(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const configuredRef = useRef(false);
  const measurementRoute = isMeasurementRoute(pathname);
  const loaderId = analyticsId ?? adsId;
  const analyticsEnabled = Boolean(analyticsId);
  const adsEnabled = Boolean(adsId);

  useEffect(() => {
    if (choice === "granted") {
      updateGoogleConsent(measurementRoute ? "granted" : "denied", analyticsEnabled, adsEnabled);
    }
  }, [adsEnabled, analyticsEnabled, choice, measurementRoute]);

  useEffect(() => {
    if (choice !== "granted" || !measurementRoute || !window.gtag) return;

    if (!configuredRef.current) {
      window.gtag("js", new Date());
      if (analyticsId) window.gtag("config", analyticsId, { send_page_view: false });
      if (adsId) window.gtag("config", adsId);
      configuredRef.current = true;
    }

    if (analyticsId) {
      window.gtag("event", "page_view", {
        page_location: `${window.location.origin}${pathname}`,
        page_path: pathname,
        send_to: analyticsId,
      });
    }
  }, [adsId, analyticsId, choice, measurementRoute, pathname]);

  function saveChoice(nextChoice: ConsentChoice) {
    localStorage.setItem(CONSENT_STORAGE_KEY, nextChoice);
    updateGoogleConsent(nextChoice, analyticsEnabled, adsEnabled);
    window.dispatchEvent(new Event(CONSENT_PREFERENCES_EVENT));
  }

  const tagEnabled = choice === "granted" && measurementRoute && Boolean(loaderId);

  return (
    <>
      {tagEnabled ? (
        <Script
          id="otopass-google-tag"
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(loaderId!)}`}
          strategy="afterInteractive"
          nonce={nonce}
        />
      ) : null}

      {choice === null && measurementRoute ? (
        <aside className="cookie-consent" role="region" aria-labelledby="cookie-consent-title">
          <div className="cookie-consent-icon" aria-hidden="true"><Cookie size={22} strokeWidth={1.8} /></div>
          <div className="cookie-consent-copy">
            <strong id="cookie-consent-title">Ölçüm tercihleri</strong>
            <p>
              {analyticsEnabled && adsEnabled
                ? "Site kullanımını anlamak ve reklam performansını ölçmek için GA4 ve Google Ads kullanmak istiyoruz. Reddederseniz Google etiketleri yüklenmez."
                : analyticsEnabled
                  ? "Site kullanımını anlamak için Google Analytics 4 kullanmak istiyoruz. Reddederseniz Google ölçüm etiketi yüklenmez."
                  : "Reklam performansını ölçmek için Google Ads kullanmak istiyoruz. Reddederseniz Google reklam etiketi yüklenmez."}
            </p>
            <Link href={privacyHref}>Gizlilik politikasını incele</Link>
          </div>
          <div className="cookie-consent-actions">
            <button type="button" className="cookie-consent-button" data-variant="secondary" onClick={() => saveChoice("denied")}>Reddet</button>
            <button type="button" className="cookie-consent-button" data-variant="primary" onClick={() => saveChoice("granted")}>
              <ShieldCheck size={16} aria-hidden="true" /> Kabul et
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      className="cookie-preferences-button"
      onClick={() => {
        localStorage.removeItem(CONSENT_STORAGE_KEY);
        window.dispatchEvent(new Event(CONSENT_PREFERENCES_EVENT));
      }}
    >
      <Cookie size={15} aria-hidden="true" /> Çerez tercihlerini yönet
    </button>
  );
}
