import { randomUUID } from "crypto";
import type { Database } from "@/lib/supabase/database.types";
import type { UserRole } from "@/lib/types";
import { getLocalSessionUser } from "./auth";
import { mutateLocalData, readLocalData } from "./store";

type DealerRow = Database["public"]["Tables"]["dealers"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];

export async function getLocalDealerBySlug(slug: string): Promise<DealerRow | null> {
  const data = await readLocalData();
  return data.dealers.find((dealer) => dealer.slug === slug) ?? null;
}

export async function getLocalDealerById(id: string): Promise<DealerRow | null> {
  const data = await readLocalData();
  return data.dealers.find((dealer) => dealer.id === id) ?? null;
}

export async function getLocalCurrentUserId(): Promise<string | null> {
  return (await getLocalSessionUser())?.id ?? null;
}

export async function getLocalUserRoles(userId: string): Promise<UserRole[]> {
  const data = await readLocalData();
  return data.users.find((user) => user.id === userId)?.roles ?? [];
}

export async function listLocalDealers(): Promise<DealerRow[]> {
  const data = await readLocalData();
  return [...data.dealers].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getLocalDealerForCurrentUser() {
  const user = await getLocalSessionUser();
  const dealerId = user?.dealer_ids[0];
  if (!user || !dealerId) return null;

  const dealerRole = user.roles.find((role) => role.startsWith("dealer_"));
  return {
    dealer_id: dealerId,
    role: dealerRole?.replace("dealer_", "") ?? "viewer",
  };
}

export async function getLocalDealerForCurrentUserWithDetails(): Promise<DealerRow | null> {
  const link = await getLocalDealerForCurrentUser();
  return link ? getLocalDealerById(link.dealer_id) : null;
}

export async function listLocalDealerApplications(dealerId: string): Promise<ApplicationRow[]> {
  const data = await readLocalData();
  return data.applications
    .filter((application) => application.dealer_id === dealerId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listLocalDealerOffers(dealerId: string): Promise<OfferRow[]> {
  const data = await readLocalData();
  return data.offers
    .filter((offer) => offer.dealer_id === dealerId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getLocalApplicationById(applicationId: string): Promise<ApplicationRow | null> {
  const data = await readLocalData();
  return data.applications.find((application) => application.id === applicationId) ?? null;
}

export async function getLocalDealerApplicationForCurrentUser(
  applicationId: string
): Promise<ApplicationRow | null> {
  const dealer = await getLocalDealerForCurrentUser();
  if (!dealer) return null;

  const application = await getLocalApplicationById(applicationId);
  return application?.dealer_id === dealer.dealer_id ? application : null;
}

export async function listLocalUsersForAdmin() {
  const data = await readLocalData();
  return [...data.users]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((user) => ({
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      must_change_password: user.must_change_password,
      is_active: true,
      created_at: user.created_at,
      roles: user.roles,
      dealer_ids: user.dealer_ids,
    }));
}

export async function getLocalAdminDashboardCounts() {
  const data = await readLocalData();
  return {
    applications: data.applications.length,
    dealers: data.dealers.length,
    offers: data.offers.length,
  };
}

export async function createLocalDealer(input: {
  name: string;
  slug: string;
  contactEmail: string | null;
}): Promise<DealerRow> {
  return mutateLocalData((data) => {
    if (data.dealers.some((dealer) => dealer.slug === input.slug)) {
      const error = new Error("Bu slug zaten kullanılıyor.") as Error & { code?: string };
      error.code = "23505";
      throw error;
    }

    const dealer: DealerRow = {
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      contact_email: input.contactEmail,
      legal_name: input.name,
      privacy_contact_email: input.contactEmail,
      logo_url: null,
      brand_color: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deactivated_at: null,
    };
    data.dealers.push(dealer);
    return dealer;
  });
}

export async function createLocalApplication(input: ApplicationInsert): Promise<ApplicationRow> {
  return mutateLocalData((data) => {
    const dealer = data.dealers.find((candidate) => candidate.id === input.dealer_id);
    if (!dealer) throw new Error("Galeri bulunamadı.");

    const application: ApplicationRow = {
      id: input.id ?? randomUUID(),
      dealer_id: input.dealer_id,
      dealer_slug: input.dealer_slug,
      owner_name: input.owner_name ?? null,
      owner_phone: input.owner_phone ?? null,
      owner_email: input.owner_email ?? null,
      brand: input.brand,
      model: input.model,
      vehicle_package: input.vehicle_package ?? null,
      model_year: input.model_year ?? null,
      km: input.km ?? null,
      fuel_type: input.fuel_type ?? null,
      transmission: input.transmission ?? null,
      tramer_info: input.tramer_info ?? null,
      damage_info: input.damage_info ?? null,
      photo_paths: input.photo_paths ?? [],
      reference_code: input.reference_code ?? null,
      status: input.status ?? "pending",
      created_at: input.created_at ?? new Date().toISOString(),
      submitted_at: input.submitted_at ?? new Date().toISOString(),
      privacy_version: input.privacy_version ?? null,
      privacy_acknowledged_at: input.privacy_acknowledged_at ?? null,
      updated_at: input.updated_at ?? new Date().toISOString(),
      archived_at: input.archived_at ?? null,
      purged_at: input.purged_at ?? null,
    };
    data.applications.push(application);
    return application;
  });
}

export async function createLocalOffer(input: {
  applicationId: string;
  dealerId: string;
  amount: number;
  notes: string | null;
}): Promise<OfferRow> {
  return mutateLocalData((data) => {
    const application = data.applications.find(
      (candidate) => candidate.id === input.applicationId && candidate.dealer_id === input.dealerId
    );
    if (!application) throw new Error("Başvuru bulunamadı.");

    const offer: OfferRow = {
      id: randomUUID(),
      application_id: input.applicationId,
      dealer_id: input.dealerId,
      amount: input.amount,
      currency: "TRY",
      notes: input.notes,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
      responded_by: null,
    };
    data.offers.push(offer);
    application.status = "offered";
    return offer;
  });
}

export async function markLocalApplicationAsSold(applicationId: string, dealerId: string): Promise<void> {
  await mutateLocalData((data) => {
    const application = data.applications.find(
      (candidate) => candidate.id === applicationId && candidate.dealer_id === dealerId
    );
    if (!application) throw new Error("Başvuru bulunamadı.");
    if (application.status !== "accepted") throw new Error("Satış için teklif kabul edilmiş olmalıdır.");
    application.status = "sold";
    application.updated_at = new Date().toISOString();
  });
}

export async function respondToLocalOffer(
  offerId: string,
  dealerId: string,
  response: "accepted" | "rejected",
  note: string | null
): Promise<void> {
  await mutateLocalData((data) => {
    const offer = data.offers.find((candidate) => candidate.id === offerId && candidate.dealer_id === dealerId);
    if (!offer || offer.status !== "pending") throw new Error("Bekleyen teklif bulunamadı.");
    const application = data.applications.find((candidate) => candidate.id === offer.application_id);
    if (!application) throw new Error("Başvuru bulunamadı.");
    offer.status = response;
    offer.responded_at = new Date().toISOString();
    offer.updated_at = new Date().toISOString();
    if (note) offer.notes = [offer.notes, note].filter(Boolean).join("\n");
    application.status = response;
    application.updated_at = new Date().toISOString();
  });
}

export async function getLocalLatestFormSubmit(
  ipHash: string,
  dealerSlug: string
): Promise<string | null> {
  const data = await readLocalData();
  const latest = data.form_rate_limits
    .filter((item) => item.ip_hash === ipHash && item.dealer_slug === dealerSlug)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return latest?.created_at ?? null;
}

export async function registerLocalFormSubmit(ipHash: string, dealerSlug: string): Promise<void> {
  await mutateLocalData((data) => {
    data.form_rate_limits.push({
      ip_hash: ipHash,
      dealer_slug: dealerSlug,
      created_at: new Date().toISOString(),
    });
  });
}
