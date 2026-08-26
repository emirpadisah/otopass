"use client";

import { GradientMesh } from "@/components/ui/gradient-mesh";

// Animasyon her temada koyu mod görünümünü korur; yalnızca sol taraftaki
// giriş formu tema değişimine uyar.
const MESH_COLORS: [string, string, string] = ["#fecaca", "#ef4444", "#111827"];

export function LoginGradientMesh({ className }: { className?: string }) {
  return (
    <GradientMesh
      className={className}
      colors={MESH_COLORS}
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

