import type { Metadata } from "next";
import { requirePasswordChangeAccess } from "@/lib/auth/password-access";
import { ChangePasswordForm } from "../change-password/ChangePasswordForm";

export const metadata: Metadata = { title: "Yeni şifre | otoköprü" };

export default async function ResetPasswordPage() {
  await requirePasswordChangeAccess();
  return <ChangePasswordForm />;
}
