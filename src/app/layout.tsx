import type { Metadata } from "next";
import { JetBrains_Mono, Onest, Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./orbyn-panels.css";
import { GoogleMeasurement } from "@/components/google-measurement";
import { ThemeProvider } from "@/components/theme-provider";
import { getGoogleMeasurementIds } from "@/lib/google-measurement-config";
import { getPublicSiteOrigin } from "@/lib/site-url";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteOrigin()),
  title: "otoköprü | Araç başvurusu ve teklif yönetimi",
  description:
    "Araç başvurularını, ekspertiz bilgilerini ve teklif süreçlerini tek çalışma alanında yönetin.",
  openGraph: { title: "otoköprü", description: "Araç başvurularını ve teklif süreçlerini tek çalışma alanında yönetin.", type: "website", locale: "tr_TR", url: "/", siteName: "otoköprü" },
  twitter: { card: "summary_large_image", title: "otoköprü", description: "Araç başvurularını ve teklif süreçlerini tek çalışma alanında yönetin." },
  manifest: "/manifest.webmanifest",
};

const themeBootstrapScript = `
(() => {
  try {
    const key = "otopass-theme";
    const root = document.documentElement;
    const stored = localStorage.getItem(key);
    const isTheme = stored === "light" || stored === "dark";
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const theme = isTheme ? stored : (prefersLight ? "light" : "dark");
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(theme === "light" ? "theme-light" : "theme-dark");
    root.dataset.theme = theme;
  } catch {}
})();
`;

function getGoogleConsentBootstrapScript(analyticsEnabled: boolean, adsEnabled: boolean) {
  return `
(() => {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function() { window.dataLayer.push(arguments); };
  let granted = false;
  try {
    granted = localStorage.getItem("otopass-google-consent-v1") === "granted";
  } catch {}
  window.gtag("consent", "default", {
    ad_storage: granted && ${adsEnabled} ? "granted" : "denied",
    ad_user_data: granted && ${adsEnabled} ? "granted" : "denied",
    ad_personalization: granted && ${adsEnabled} ? "granted" : "denied",
    analytics_storage: granted && ${analyticsEnabled} ? "granted" : "denied"
  });
  window.gtag("set", "ads_data_redaction", !(granted && ${adsEnabled}));
})();
`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const googleMeasurement = getGoogleMeasurementIds();
  const googleMeasurementEnabled = Boolean(googleMeasurement.analyticsId || googleMeasurement.adsId);
  const privacyHref = new URL("/privacy", getPublicSiteOrigin()).toString();
  return (
    <html lang="tr" className="theme-dark" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        {googleMeasurementEnabled ? (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: getGoogleConsentBootstrapScript(Boolean(googleMeasurement.analyticsId), Boolean(googleMeasurement.adsId)),
            }}
          />
        ) : null}
      </head>
      <body className={`${plusJakarta.variable} ${jetBrainsMono.variable} ${onest.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
        {googleMeasurementEnabled ? (
          <GoogleMeasurement
            analyticsId={googleMeasurement.analyticsId}
            adsId={googleMeasurement.adsId}
            nonce={nonce}
            privacyHref={privacyHref}
          />
        ) : null}
      </body>
    </html>
  );
}
