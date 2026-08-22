"use server";

import { revalidatePath } from "next/cache";
import { canManageDealerMembership } from "@/lib/auth/route";
import { requireUser } from "@/lib/auth/session";
import { normalizeCustomDomain } from "@/lib/domain-name";
import { isLocalDataMode } from "@/lib/data-mode";
import { getDealerForCurrentUser } from "@/lib/supabase/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ActionResponse } from "@/lib/types";
import {
  addVercelProjectDomain,
  getFriendlyDomainError,
  inspectVercelProjectDomain,
  removeVercelProjectDomain,
  verifyVercelProjectDomain,
  type VercelDomainSnapshot,
} from "@/lib/vercel/domains";

async function getDomainActionContext() {
  const actor = await requireUser();
  const membership = await getDealerForCurrentUser();
  if (!membership || !canManageDealerMembership(membership.role)) return null;
  return { actor, membership, service: createSupabaseServiceClient() };
}

function snapshotUpdate(snapshot: VercelDomainSnapshot) {
  const now = new Date().toISOString();
  return {
    status: snapshot.status,
    verification: snapshot.verification,
    dns_records: snapshot.dnsRecords,
    last_error: null,
    last_checked_at: now,
    verified_at: snapshot.status === "verified" ? now : null,
  };
}

function domainValidationMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Geçerli bir alan adı girin.";
  if (error.message === "WILDCARD_NOT_ALLOWED") return "Wildcard alan adları desteklenmiyor.";
  return "Geçerli bir alan adı girin. Örnek: basvuru.galeriniz.com";
}

export async function addDealerDomainAction(
  _state: ActionResponse,
  formData: FormData,
): Promise<ActionResponse> {
  if (isLocalDataMode()) return { ok: false, code: "UNAVAILABLE", message: "Alan adı bağlantısı yalnız production ortamında kullanılabilir." };
  const context = await getDomainActionContext();
  if (!context) return { ok: false, code: "FORBIDDEN", message: "Alan adı yönetme yetkiniz bulunmuyor." };

  let hostname: string;
  try {
    hostname = normalizeCustomDomain(String(formData.get("hostname") ?? ""));
  } catch (error) {
    return { ok: false, code: "VALIDATION", message: domainValidationMessage(error) };
  }

  const { actor, membership, service } = context;
  const { data: dealerDomain } = await service
    .from("dealer_domains")
    .select("id, hostname")
    .eq("dealer_id", membership.dealer_id)
    .maybeSingle();
  if (dealerDomain) {
    return { ok: false, code: "DOMAIN_EXISTS", message: "Galerinize zaten bir alan adı bağlı. Önce mevcut kaydı kaldırın." };
  }

  const { data: claimedDomain } = await service
    .from("dealer_domains")
    .select("id")
    .eq("hostname", hostname)
    .maybeSingle();
  if (claimedDomain) return { ok: false, code: "DOMAIN_CLAIMED", message: "Bu alan adı başka bir galeriye bağlı." };

  try {
    await addVercelProjectDomain(hostname);
    const snapshot = await inspectVercelProjectDomain(hostname);
    const { error } = await service.from("dealer_domains").insert({
      dealer_id: membership.dealer_id,
      hostname,
      ...snapshotUpdate(snapshot),
    });
    if (error) {
      await removeVercelProjectDomain(hostname).catch(() => undefined);
      return { ok: false, code: "INSERT_FAILED", message: "Alan adı kaydı oluşturulamadı." };
    }

    await service.from("activity_log").insert({
      actor_user_id: actor.id,
      dealer_id: membership.dealer_id,
      action: "DEALER_DOMAIN_ADDED",
      metadata: { hostname },
    });
    revalidatePath("/dealer/profile");
    return { ok: true, code: "DOMAIN_ADDED", message: "Alan adı eklendi. DNS kayıtlarını tamamlayın." };
  } catch (error) {
    return { ok: false, code: "DOMAIN_PROVIDER_ERROR", message: getFriendlyDomainError(error) };
  }
}

export async function refreshDealerDomainAction(
  _state: ActionResponse,
  _formData: FormData,
): Promise<ActionResponse> {
  void _state;
  void _formData;
  if (isLocalDataMode()) return { ok: false, code: "UNAVAILABLE", message: "Alan adı bağlantısı yalnız production ortamında kullanılabilir." };
  const context = await getDomainActionContext();
  if (!context) return { ok: false, code: "FORBIDDEN", message: "Alan adı yönetme yetkiniz bulunmuyor." };
  const { actor, membership, service } = context;
  const { data: domain } = await service
    .from("dealer_domains")
    .select("id, hostname")
    .eq("dealer_id", membership.dealer_id)
    .maybeSingle();
  if (!domain) return { ok: false, code: "NOT_FOUND", message: "Bağlı alan adı bulunamadı." };

  try {
    const snapshot = await verifyVercelProjectDomain(domain.hostname);
    await service.from("dealer_domains").update(snapshotUpdate(snapshot)).eq("id", domain.id);
    await service.from("activity_log").insert({
      actor_user_id: actor.id,
      dealer_id: membership.dealer_id,
      action: "DEALER_DOMAIN_CHECKED",
      metadata: { hostname: domain.hostname, status: snapshot.status },
    });
    revalidatePath("/dealer/profile");
    return {
      ok: true,
      code: "DOMAIN_CHECKED",
      message: snapshot.status === "verified" ? "Alan adı doğrulandı ve yayına hazır." : "DNS henüz doğrulanmadı. Kayıtları kontrol edin.",
    };
  } catch (error) {
    const message = getFriendlyDomainError(error);
    await service.from("dealer_domains").update({
      status: "error",
      last_error: message,
      last_checked_at: new Date().toISOString(),
    }).eq("id", domain.id);
    revalidatePath("/dealer/profile");
    return { ok: false, code: "DOMAIN_PROVIDER_ERROR", message };
  }
}

export async function removeDealerDomainAction(
  _state: ActionResponse,
  _formData: FormData,
): Promise<ActionResponse> {
  void _state;
  void _formData;
  if (isLocalDataMode()) return { ok: false, code: "UNAVAILABLE", message: "Alan adı bağlantısı yalnız production ortamında kullanılabilir." };
  const context = await getDomainActionContext();
  if (!context) return { ok: false, code: "FORBIDDEN", message: "Alan adı yönetme yetkiniz bulunmuyor." };
  const { actor, membership, service } = context;
  const { data: domain } = await service
    .from("dealer_domains")
    .select("id, hostname")
    .eq("dealer_id", membership.dealer_id)
    .maybeSingle();
  if (!domain) return { ok: false, code: "NOT_FOUND", message: "Bağlı alan adı bulunamadı." };

  try {
    await removeVercelProjectDomain(domain.hostname);
    const { error } = await service.from("dealer_domains").delete().eq("id", domain.id);
    if (error) return { ok: false, code: "DELETE_FAILED", message: "Alan adı kaydı kaldırılamadı." };
    await service.from("activity_log").insert({
      actor_user_id: actor.id,
      dealer_id: membership.dealer_id,
      action: "DEALER_DOMAIN_REMOVED",
      metadata: { hostname: domain.hostname },
    });
    revalidatePath("/dealer/profile");
    return { ok: true, code: "DOMAIN_REMOVED", message: "Alan adı bağlantısı kaldırıldı." };
  } catch (error) {
    return { ok: false, code: "DOMAIN_PROVIDER_ERROR", message: getFriendlyDomainError(error) };
  }
}
