import type { Metadata } from "next";
import { CocoonLanding } from "@/components/landing/cocoon-landing";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <CocoonLanding />;
}
