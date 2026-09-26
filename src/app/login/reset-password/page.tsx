import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireCompletedMfa } from "@/lib/auth/mfa";
import { ChangePasswordForm } from "../change-password/ChangePasswordForm";

export const metadata: Metadata = { title: "Yeni şifre | otoköprü" };

export default async function ResetPasswordPage() {
  await requireUser();
  await requireCompletedMfa();
  return <ChangePasswordForm />;
}
