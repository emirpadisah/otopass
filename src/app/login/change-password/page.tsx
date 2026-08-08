import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = {
  title: "Şifre Yenileme | Otopass",
  description: "Geçici Otopass şifrenizi güvenli bir kalıcı şifreyle değiştirin.",
};

export default async function ChangePasswordPage() {
  await requireUser();
  return <ChangePasswordForm />;
}
