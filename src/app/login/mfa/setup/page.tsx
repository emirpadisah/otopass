import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserRoles } from "@/lib/auth/roles";
import { hasDealerRole } from "@/lib/auth/route";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "İki adımlı doğrulama | POL-CAR" };

export default async function MfaSetupPage() {
  await requireUser();
  const roles = await getCurrentUserRoles();
  if (roles.some((role) => role === "admin" || role === "super_admin")) redirect("/admin");
  if (hasDealerRole(roles)) redirect("/dealer/security");
  redirect("/login");
}
