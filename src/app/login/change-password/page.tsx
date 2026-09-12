import type { Metadata } from "next";
import { requirePasswordChangeAccess } from "@/lib/auth/password-access";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = {
  title: "Şifre yenileme | otoköprü",
  description: "Geçici şifrenizi yalnızca sizin bildiğiniz yeni bir şifreyle değiştirin.",
};

export default async function ChangePasswordPage() {
  await requirePasswordChangeAccess();
  return <ChangePasswordForm />;
}
