import type { Metadata } from "next";
import { MfaSetup } from "@/app/login/mfa/setup/MfaSetup";

export const metadata: Metadata = { title: "Hesap güvenliği" };

export default function DealerSecurityPage() {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <MfaSetup redirectTo="/dealer" />
    </div>
  );
}
