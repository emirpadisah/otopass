import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

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

export const metadata: Metadata = {
  title: "OtoPass | Araç Alım Operasyonunu Tek Akışta Yönetin",
  description:
    "Müşteri başvurusundan galeri teklifine kadar araç alım sürecini tek merkezden yöneten operasyon platformu.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="theme-dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${plusJakarta.variable} ${jetBrainsMono.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
