"use client";

import { useTheme } from "@/components/theme-provider";
import { GradientMesh } from "@/components/ui/gradient-mesh";

const DARK_COLORS: [string, string, string] = ["#fecaca", "#ef4444", "#111827"];
const LIGHT_COLORS: [string, string, string] = ["#fff1f2", "#fb7185", "#e2e8f0"];

export function LoginGradientMesh({ className }: { className?: string }) {
  const { theme } = useTheme();

  return (
    <GradientMesh
      className={className}
      colors={theme === "light" ? LIGHT_COLORS : DARK_COLORS}
      distortion={8}
      swirl={0.2}
      speed={0.8}
      rotation={90}
      waveAmp={0.2}
      waveFreq={20}
      waveSpeed={0.2}
      grain={0.055}
    />
  );
}

