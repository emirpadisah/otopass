"use client";

import { useLayoutEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ui";

export function LoginThemeToggle() {
  const { theme } = useTheme();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(theme === "light" ? "theme-light" : "theme-dark");
    root.dataset.theme = theme;
  }, [theme]);

  return <ThemeToggle compact />;
}
