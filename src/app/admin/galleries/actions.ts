"use server";

import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";
import { requireAdminAccess } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { isLocalDataMode } from "@/lib/data-mode";
import { createLocalDealer } from "@/lib/local/repository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function slugify(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function createDealerAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  await requireUser();
  await requireAdminAccess();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();

  if (!name) {
    return { ok: false, code: "VALIDATION", message: "Galeri adı zorunludur." };
  }

  if (name.length > 120) {
    return { ok: false, code: "VALIDATION", message: "Galeri adı en fazla 120 karakter olabilir." };
  }

  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return { ok: false, code: "VALIDATION", message: "Geçerli bir iletişim e-postası girin." };
  }

  const slug = slugify(slugInput || name);
  if (!slug) {
    return { ok: false, code: "VALIDATION", message: "Geçerli bir slug üretilemedi." };
  }

  if (isLocalDataMode()) {
    try {
      await createLocalDealer({ name, slug, contactEmail: contactEmail || null });
      revalidatePath("/admin/galleries");
      revalidatePath("/admin/users");
      return { ok: true, code: "DEALER_CREATED", message: "Galeri başarıyla oluşturuldu." };
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      return {
        ok: false,
        code: code === "23505" ? "DUPLICATE" : "INSERT_FAILED",
        message: error instanceof Error ? error.message : "Galeri oluşturulamadı.",
      };
    }
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("dealers").insert({
    name,
    slug,
    contact_email: contactEmail || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, code: "DUPLICATE", message: "Bu slug zaten kullanılıyor." };
    }
    return { ok: false, code: "INSERT_FAILED", message: error.message || "Galeri oluşturulamadı." };
  }

  revalidatePath("/admin/galleries");
  revalidatePath("/admin/users");

  return { ok: true, code: "DEALER_CREATED", message: "Galeri başarıyla oluşturuldu." };
}
