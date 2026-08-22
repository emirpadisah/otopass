"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "./button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { isReady, theme, toggleTheme } = useTheme();
  const label = !isReady ? "Tema" : theme === "dark" ? "Açık tema" : "Koyu tema";
  const title = !isReady ? "Tema tercihi hazırlanıyor" : theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç";

  return (
    <Button
      variant="secondary"
      size="sm"
      type="button"
      className={cn(compact ? "h-10 w-10 px-0" : "min-w-28", className)}
      onClick={toggleTheme}
      disabled={!isReady}
      aria-label={title}
      title={title}
    >
      {!isReady ? (
        <MoonStar size={16} aria-hidden="true" />
      ) : theme === "dark" ? (
        <SunMedium size={16} aria-hidden="true" />
      ) : (
        <MoonStar size={16} aria-hidden="true" />
      )}
      {compact ? null : <span>{label}</span>}
    </Button>
  );
}
