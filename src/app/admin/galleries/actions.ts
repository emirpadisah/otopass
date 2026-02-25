"use server";

import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";
import { requireAdminAccess } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
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

  const slug = slugify(slugInput || name);
  if (!slug) {
    return { ok: false, code: "VALIDATION", message: "Geçerli bir slug üretilemedi." };
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
