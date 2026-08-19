import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserRoles } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { MfaSetup } from "./MfaSetup";

export const metadata: Metadata = { title: "MFA Kurulumu | POL-CAR" };

export default async function MfaSetupPage() {
  await requireUser();
  const roles = await getCurrentUserRoles();
  if (!roles.some((role) => role === "admin" || role === "super_admin")) redirect("/dealer");
  return <main className="grid min-h-screen place-items-center px-4 py-8"><MfaSetup /></main>;
}
