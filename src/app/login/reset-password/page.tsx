import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "../change-password/ChangePasswordForm";

export const metadata: Metadata = { title: "Yeni şifre | POL-CAR" };

export default async function ResetPasswordPage() {
  await requireUser();
  return <ChangePasswordForm />;
}
