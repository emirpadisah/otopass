"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResponse } from "@/lib/types";
import { requireAdminAccess } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { DEALER_ASSET_BUCKET, getManagedDealerLogoPath } from "@/lib/dealer-branding";
import { isLocalDataMode } from "@/lib/data-mode";
import { createLocalDealer } from "@/lib/local/repository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentUserRoles } from "@/lib/auth/roles";
import { isVercelDomainServiceConfigured, removeVercelProjectDomain } from "@/lib/vercel/domains";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function dealerDeleteErrorMessage(error: { code?: string | null }): string {
  if (error.code === "23503") return "Galeriye bağlı bazı kayıtlar silme işlemini engelliyor. Önce bağlı kayıtları kontrol edin.";
  if (error.code === "42501") return "Galeri silme yetkisi doğrulanamadı. Oturumu yenileyip tekrar deneyin.";
  return "Galeri silinemedi. Kayıtlar değiştirilmedi; lütfen tekrar deneyin.";
}

export async function updateDealerAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();
  const dealerId = String(formData.get("dealerId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const legalName = String(formData.get("legalName") ?? "").trim() || null;
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const privacyEmail = String(formData.get("privacyEmail") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";
  if (!UUID_PATTERN.test(dealerId) || !name || name.length > 120 || (legalName?.length ?? 0) > 160) return { ok: false, code: "VALIDATION", message: "Galeri bilgileri geçersiz." };
  if ((contactEmail?.length ?? 0) > 160 || (privacyEmail?.length ?? 0) > 160) return { ok: false, code: "VALIDATION", message: "İletişim bilgileri çok uzun." };
  if ([contactEmail, privacyEmail].some((email) => email && !/^\S+@\S+\.\S+$/.test(email))) return { ok: false, code: "VALIDATION", message: "E-posta adreslerini kontrol edin." };
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("dealers").update({ name, legal_name: legalName, contact_email: contactEmail, privacy_contact_email: privacyEmail, is_active: isActive, deactivated_at: isActive ? null : new Date().toISOString() }).eq("id", dealerId);
  if (error) return { ok: false, code: "UPDATE_FAILED", message: "Galeri güncellenemedi." };
  await supabase.from("activity_log").insert({ actor_user_id: actor.id, dealer_id: dealerId, action: "ADMIN_DEALER_UPDATED", metadata: { is_active: isActive } });
  revalidatePath("/admin/galleries");
  revalidatePath(`/admin/galleries/${dealerId}`);
  revalidatePath("/admin/users");
  return { ok: true, code: "DEALER_UPDATED", message: "Galeri bilgileri güncellendi." };
}

export async function deleteDealerAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();
  const roles = await getCurrentUserRoles();
  if (!roles.includes("super_admin")) return { ok: false, code: "FORBIDDEN", message: "Kalıcı silme işlemini yalnızca süper yönetici yapabilir." };
  const dealerId = String(formData.get("dealerId") ?? "").trim();
  if (!UUID_PATTERN.test(dealerId)) return { ok: false, code: "VALIDATION", message: "Galeri bilgisi geçersiz." };
  const supabase = createSupabaseServiceClient();

  const [{ data: dealer, error: dealerError }, { data: applications, error: applicationsError }, { data: domain, error: domainError }] = await Promise.all([
    supabase.from("dealers").select("id, name, logo_url").eq("id", dealerId).maybeSingle(),
    supabase.from("applications").select("photo_paths").eq("dealer_id", dealerId),
    supabase.from("dealer_domains").select("hostname").eq("dealer_id", dealerId).maybeSingle(),
  ]);
  if (dealerError || applicationsError || domainError) {
    const lookupError = dealerError ?? applicationsError ?? domainError;
    Sentry.captureException(lookupError, { tags: { operation: "admin-dealer-delete-lookup" }, extra: { dealerId } });
    return { ok: false, code: "LOOKUP_FAILED", message: "Galeriye bağlı kayıtlar doğrulanamadı. Hiçbir kayıt silinmedi." };
  }
  if (!dealer) return { ok: false, code: "NOT_FOUND", message: "Galeri bulunamadı veya daha önce silindi." };

  const { error: auditError } = await supabase.from("activity_log").insert({
    actor_user_id: actor.id,
    dealer_id: dealerId,
    action: "ADMIN_DEALER_DELETE_REQUESTED",
    metadata: { target_dealer_id: dealerId, dealer_name: dealer.name },
  });
  if (auditError) {
    Sentry.captureException(auditError, { tags: { operation: "admin-dealer-delete-audit" }, extra: { dealerId } });
    return { ok: false, code: "AUDIT_FAILED", message: "Silme işlemi güvenli biçimde kaydedilemedi. Hiçbir kayıt silinmedi." };
  }

  const { error } = await supabase.from("dealers").delete().eq("id", dealerId);
  if (error) {
    Sentry.captureException(error, { tags: { operation: "admin-dealer-delete" }, extra: { dealerId, errorCode: error.code } });
    return { ok: false, code: "DELETE_FAILED", message: dealerDeleteErrorMessage(error) };
  }

  const photoPaths = (applications ?? []).flatMap((application) => application.photo_paths ?? []);
  const logoPath = getManagedDealerLogoPath(dealer.logo_url);
  const cleanupResults = await Promise.all([
    photoPaths.length > 0 ? supabase.storage.from("applications").remove(photoPaths) : Promise.resolve({ error: null }),
    logoPath ? supabase.storage.from(DEALER_ASSET_BUCKET).remove([logoPath]) : Promise.resolve({ error: null }),
    domain?.hostname && isVercelDomainServiceConfigured()
      ? removeVercelProjectDomain(domain.hostname).then(() => ({ error: null })).catch((cleanupError: unknown) => ({ error: cleanupError }))
      : Promise.resolve({ error: domain?.hostname ? new Error("VERCEL_DOMAIN_CLEANUP_NOT_CONFIGURED") : null }),
  ]);
  const cleanupFailed = cleanupResults.some((result) => Boolean(result.error));
  if (cleanupFailed) {
    Sentry.captureMessage("Dealer deleted with pending asset cleanup", {
      level: "warning",
      tags: { operation: "admin-dealer-delete-cleanup" },
      extra: { dealerId, photoCount: photoPaths.length, hasLogo: Boolean(logoPath), hostname: domain?.hostname ?? null },
    });
  }

  await supabase.from("activity_log").insert({
    actor_user_id: actor.id,
    action: "ADMIN_DEALER_DELETED",
    metadata: { target_dealer_id: dealerId, dealer_name: dealer.name, cleanup_pending: cleanupFailed },
  });
  revalidatePath("/admin/galleries");
  revalidatePath("/admin/users");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/offers");
  revalidatePath("/admin/audit");
  revalidatePath("/admin");
  redirect(`/admin/galleries?deleted=1${cleanupFailed ? "&cleanup=pending" : ""}`);
}

export async function createDealerAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const actor = await requireUser();
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

  if (contactEmail.length > 160 || (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail))) {
    return { ok: false, code: "VALIDATION", message: "Geçerli bir iletişim e-postası girin." };
  }

  const slug = slugify(slugInput || name);
  if (!slug) {
    return { ok: false, code: "VALIDATION", message: "Geçerli bir başvuru kodu oluşturulamadı." };
  }

  if (isLocalDataMode()) {
    try {
      await createLocalDealer({ name, slug, contactEmail: contactEmail || null });
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      return {
        ok: false,
        code: code === "23505" ? "DUPLICATE" : "INSERT_FAILED",
        message: code === "23505" ? "Bu başvuru kodu zaten kullanılıyor." : "Galeri oluşturulamadı. Lütfen yeniden deneyin.",
      };
    }
    revalidatePath("/admin/galleries");
    revalidatePath("/admin/users");
    redirect("/admin/galleries?created=1");
  }

  const supabase = createSupabaseServiceClient();
  const { data: dealer, error } = await supabase.from("dealers").insert({
    name,
    slug,
    contact_email: contactEmail || null,
  }).select("id").single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, code: "DUPLICATE", message: "Bu başvuru kodu zaten kullanılıyor." };
    }
    Sentry.captureException(error, {
      tags: { operation: "admin-dealer-create", errorCode: error.code ?? "unknown" },
      extra: { slug },
    });
    return { ok: false, code: "INSERT_FAILED", message: "Galeri oluşturulamadı. Lütfen yeniden deneyin." };
  }

  const { error: auditError } = await supabase.from("activity_log").insert({
    actor_user_id: actor.id,
    dealer_id: dealer.id,
    action: "ADMIN_DEALER_CREATED",
    metadata: { target_dealer_id: dealer.id, slug },
  });
  if (auditError) {
    await supabase.from("dealers").delete().eq("id", dealer.id);
    Sentry.captureException(auditError, {
      tags: { operation: "admin-dealer-create-audit", errorCode: auditError.code ?? "unknown" },
      extra: { dealerId: dealer.id, slug },
    });
    return { ok: false, code: "AUDIT_FAILED", message: "Galeri işlem kaydı oluşturulamadı." };
  }

  revalidatePath("/admin/galleries");
  revalidatePath("/admin/users");
  redirect("/admin/galleries?created=1");
}
