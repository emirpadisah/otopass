import type { Metadata } from "next";
import { JetBrains_Mono, Onest, Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./orbyn-panels.css";
import { ThemeProvider } from "@/components/theme-provider";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="tr" className="theme-dark" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${plusJakarta.variable} ${jetBrainsMono.variable} ${onest.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
