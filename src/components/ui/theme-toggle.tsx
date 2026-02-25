"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "./button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { isReady, theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="secondary"
      size="sm"
      type="button"
      className={cn("min-w-28", className)}
      onClick={toggleTheme}
      disabled={!isReady}
      aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
      title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
    >
      {theme === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
      <span>{theme === "dark" ? "Açık Tema" : "Koyu Tema"}</span>
    </Button>
  );
}
