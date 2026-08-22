import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = {
  title: "Şifre yenileme | POL-CAR",
  description: "Geçici şifrenizi yalnızca sizin bildiğiniz yeni bir şifreyle değiştirin.",
};

export default async function ChangePasswordPage() {
  await requireUser();
  return <ChangePasswordForm />;
}
