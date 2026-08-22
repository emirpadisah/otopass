import { cache } from "react";
import { createSupabaseServerClient } from "./server";
import { createSupabaseServiceClient } from "./service";
import type { Database } from "./database.types";
import { isLocalDataMode } from "@/lib/data-mode";
import {
  getLocalAdminDashboardCounts,
  getLocalCurrentUserId,
  getLocalDealerApplicationForCurrentUser,
  getLocalDealerById,
  getLocalDealerBySlug,
  getLocalDealerForCurrentUser,
  getLocalDealerForCurrentUserWithDetails,
  getLocalUserRoles,
  listLocalDealerApplications,
  listLocalDealerOffers,
  listLocalDealers,
  listLocalUsersForAdmin,
} from "@/lib/local/repository";
import type { ApplicationStatus, PaginatedResult, PaginationInput, UserRole } from "@/lib/types";
import { isMissingColumn, isMissingRelation } from "./schema-compat";
import { safeSearchTerm } from "@/lib/pagination";

type DealerRow = Database["public"]["Tables"]["dealers"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type DealerDomainRow = Database["public"]["Tables"]["dealer_domains"]["Row"];
type DealerApplicationListRow = Pick<ApplicationRow,
  "id" | "reference_code" | "owner_name" | "owner_phone" | "brand" | "model" | "model_year" | "km" | "status" | "created_at"
>;
type DealerDashboardApplication = Pick<ApplicationRow, "id" | "brand" | "model">;
type DealerDashboardOffer = Pick<OfferRow, "id" | "application_id" | "amount" | "created_at">;

export type DealerApplicationPage = PaginatedResult<DealerApplicationListRow> & {
  statusCounts: Record<ApplicationStatus, number>;
  latestOfferByApplication: Record<string, number>;
};

type DealerLinkRow = {
  dealer_id: string;
  role: string;
  created_at: string;
};

export type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];

export async function getDealerBySlug(slug: string): Promise<DealerRow | null> {
  if (isLocalDataMode()) {
    const dealer = await getLocalDealerBySlug(slug);
    return dealer?.is_active === false ? null : dealer;
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("dealers").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!error) return (data as DealerRow | null) ?? null;
  if (!isMissingColumn(error, "is_active")) throw error;

  const { data: legacyDealer, error: legacyError } = await supabase.from("dealers").select("*").eq("slug", slug).maybeSingle();
  if (legacyError) throw legacyError;
  if (!legacyDealer) return null;
  return {
    ...legacyDealer,
    legal_name: null,
    privacy_contact_email: null,
    logo_url: null,
    brand_color: null,
    is_active: true,
    updated_at: legacyDealer.created_at,
    deactivated_at: null,
  } as DealerRow;
}

export async function getDealerById(id: string): Promise<DealerRow | null> {
  if (isLocalDataMode()) return getLocalDealerById(id);

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("dealers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as DealerRow | null) ?? null;
}

export const getCurrentUserId = cache(async (): Promise<string | null> => {
  if (isLocalDataMode()) return getLocalCurrentUserId();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user?.id ?? null;
});

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  if (isLocalDataMode()) return getLocalUserRoles(userId);

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.role as UserRole);
}

export async function listDealers(): Promise<DealerRow[]> {
  if (isLocalDataMode()) return listLocalDealers();

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("dealers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DealerRow[]) ?? [];
}

export const getDealerForCurrentUser = cache(async () => {
  if (isLocalDataMode()) return getLocalDealerForCurrentUser();

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("dealer_users")
    .select("dealer_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  const row = ((data as DealerLinkRow[] | null) ?? [])[0];
  if (!row) return null;

  const { data: activeDealer } = await supabase.from("dealers").select("id").eq("id", row.dealer_id).eq("is_active", true).maybeSingle();
  if (!activeDealer) return null;

  return {
    dealer_id: row.dealer_id,
    role: row.role,
  };
});

export async function getDealerForCurrentUserWithDetails() {
  if (isLocalDataMode()) return getLocalDealerForCurrentUserWithDetails();

  const link = await getDealerForCurrentUser();
  if (!link?.dealer_id) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("dealers")
    .select("*")
    .eq("id", link.dealer_id)
    .maybeSingle();
  if (error) throw error;
  return (data as DealerRow | null) ?? null;
}

export async function getDealerDomainByDealerId(dealerId: string): Promise<DealerDomainRow | null | undefined> {
  if (isLocalDataMode()) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("dealer_domains")
    .select("*")
    .eq("dealer_id", dealerId)
    .maybeSingle();
  if (error && isMissingRelation(error, "dealer_domains")) return undefined;
  if (error) throw error;
  return (data as DealerDomainRow | null) ?? null;
}

export async function listDealerApplications(dealerId: string): Promise<ApplicationRow[]> {
  if (isLocalDataMode()) return listLocalDealerApplications(dealerId);

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("dealer_id", dealerId)
    .not("submitted_at", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ApplicationRow[]) ?? [];
}

const APPLICATION_STATUSES: ApplicationStatus[] = ["pending", "offered", "accepted", "rejected", "sold", "archived"];

function emptyStatusCounts(): Record<ApplicationStatus, number> {
  return { pending: 0, offered: 0, accepted: 0, rejected: 0, sold: 0, archived: 0 };
}

export async function listDealerApplicationPage(
  dealerId: string,
  input: PaginationInput,
): Promise<DealerApplicationPage> {
  const activeStatus = APPLICATION_STATUSES.includes(input.status as ApplicationStatus)
    ? input.status as ApplicationStatus
    : null;
  const q = safeSearchTerm(input.q || "");
  const from = (input.page - 1) * input.pageSize;

  if (isLocalDataMode()) {
    const applications = await listLocalDealerApplications(dealerId);
    const counts = emptyStatusCounts();
    applications.forEach((application) => { counts[application.status as ApplicationStatus] += 1; });
    const normalizedQuery = q.toLocaleLowerCase("tr-TR");
    const filtered = applications
      .filter((application) => !activeStatus || application.status === activeStatus)
      .filter((application) => !normalizedQuery || [application.reference_code, application.owner_name, application.owner_phone, application.owner_email, application.brand, application.model]
        .some((value) => value?.toLocaleLowerCase("tr-TR").includes(normalizedQuery)))
      .sort((a, b) => input.sort === "oldest" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
    const items = filtered.slice(from, from + input.pageSize).map((application) => ({
      id: application.id,
      reference_code: application.reference_code,
      owner_name: application.owner_name,
      owner_phone: application.owner_phone,
      brand: application.brand,
      model: application.model,
      model_year: application.model_year,
      km: application.km,
      status: application.status,
      created_at: application.created_at,
    }));
    const visibleIds = new Set(items.map((item) => item.id));
    const offers = await listLocalDealerOffers(dealerId);
    const latestOfferByApplication: Record<string, number> = {};
    offers.forEach((offer) => {
      if (visibleIds.has(offer.application_id) && latestOfferByApplication[offer.application_id] === undefined) {
        latestOfferByApplication[offer.application_id] = offer.amount;
      }
    });
    return {
      items,
      total: filtered.length,
      page: input.page,
      pageSize: input.pageSize,
      pageCount: Math.max(1, Math.ceil(filtered.length / input.pageSize)),
      statusCounts: counts,
      latestOfferByApplication,
    };
  }

  const supabase = createSupabaseServiceClient();
  let pageQuery = supabase
    .from("applications")
    .select("id, reference_code, owner_name, owner_phone, brand, model, model_year, km, status, created_at", { count: "exact" })
    .eq("dealer_id", dealerId)
    .not("submitted_at", "is", null);
  if (activeStatus) pageQuery = pageQuery.eq("status", activeStatus);
  if (q) pageQuery = pageQuery.or(`reference_code.ilike.%${q}%,owner_name.ilike.%${q}%,owner_phone.ilike.%${q}%,owner_email.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`);

  const [pageResult, ...statusResults] = await Promise.all([
    pageQuery.order("created_at", { ascending: input.sort === "oldest" }).range(from, from + input.pageSize - 1),
    ...APPLICATION_STATUSES.map((status) => supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("dealer_id", dealerId)
      .eq("status", status)
      .not("submitted_at", "is", null)),
  ]);
  const { data, count, error } = pageResult;
  if (error) throw error;

  const items = (data ?? []) as DealerApplicationListRow[];
  const counts = emptyStatusCounts();
  statusResults.forEach((statusResult, index) => {
    if (statusResult.error) throw statusResult.error;
    counts[APPLICATION_STATUSES[index]] = statusResult.count ?? 0;
  });
  const latestOfferByApplication: Record<string, number> = {};
  if (items.length > 0) {
    const { data: offers, error: offersError } = await supabase
      .from("offers")
      .select("application_id, amount, created_at")
      .eq("dealer_id", dealerId)
      .in("application_id", items.map((item) => item.id))
      .order("created_at", { ascending: false });
    if (offersError) throw offersError;
    (offers ?? []).forEach((offer) => {
      if (latestOfferByApplication[offer.application_id] === undefined) {
        latestOfferByApplication[offer.application_id] = offer.amount;
      }
    });
  }

  const total = count ?? 0;
  return {
    items,
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    statusCounts: counts,
    latestOfferByApplication,
  };
}

export async function listDealerApplicationsForCurrentUser(): Promise<ApplicationRow[]> {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) return [];
  return listDealerApplications(dealer.dealer_id);
}

export async function listDealerOffers(dealerId: string): Promise<OfferRow[]> {
  if (isLocalDataMode()) return listLocalDealerOffers(dealerId);

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OfferRow[]) ?? [];
}

export async function listDealerOffersForCurrentUser(): Promise<OfferRow[]> {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) return [];
  return listDealerOffers(dealer.dealer_id);
}

export async function listDealerOffersForApplicationCurrentUser(applicationId: string): Promise<OfferRow[]> {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) return [];
  if (isLocalDataMode()) {
    return (await listLocalDealerOffers(dealer.dealer_id)).filter((offer) => offer.application_id === applicationId);
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("dealer_id", dealer.dealer_id)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OfferRow[] | null) ?? [];
}

export async function getDealerDashboardData(dealerId: string): Promise<{
  applications: DealerDashboardApplication[];
  offers: DealerDashboardOffer[];
  applicationCount: number;
  pendingCount: number;
  offeredCount: number;
  soldCount: number;
  offerCount: number;
}> {
  if (isLocalDataMode()) {
    const [applications, offers] = await Promise.all([
      listLocalDealerApplications(dealerId),
      listLocalDealerOffers(dealerId),
    ]);
    const recentOffers = offers.slice(0, 8);
    const recentApplicationIds = new Set(recentOffers.map((offer) => offer.application_id));
    return {
      applications: applications.filter((application) => recentApplicationIds.has(application.id)).map(({ id, brand, model }) => ({ id, brand, model })),
      offers: recentOffers.map(({ id, application_id, amount, created_at }) => ({ id, application_id, amount, created_at })),
      applicationCount: applications.length,
      pendingCount: applications.filter((application) => application.status === "pending").length,
      offeredCount: applications.filter((application) => application.status === "offered").length,
      soldCount: applications.filter((application) => application.status === "sold").length,
      offerCount: offers.length,
    };
  }

  const supabase = createSupabaseServiceClient();
  const [applicationsCount, pendingCount, offeredCount, soldCount, offersCount, recentOffers] = await Promise.all([
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("dealer_id", dealerId).not("submitted_at", "is", null),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("dealer_id", dealerId).eq("status", "pending").not("submitted_at", "is", null),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("dealer_id", dealerId).eq("status", "offered").not("submitted_at", "is", null),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("dealer_id", dealerId).eq("status", "sold").not("submitted_at", "is", null),
    supabase.from("offers").select("*", { count: "exact", head: true }).eq("dealer_id", dealerId),
    supabase.from("offers").select("id, application_id, amount, created_at").eq("dealer_id", dealerId).order("created_at", { ascending: false }).limit(8),
  ]);
  const failedCount = [applicationsCount, pendingCount, offeredCount, soldCount, offersCount].find((result) => result.error);
  if (failedCount?.error) throw failedCount.error;
  if (recentOffers.error) throw recentOffers.error;
  const applicationIds = [...new Set((recentOffers.data ?? []).map((offer) => offer.application_id))];
  const applicationResult = applicationIds.length > 0
    ? await supabase.from("applications").select("id, brand, model").in("id", applicationIds)
    : { data: [], error: null };
  if (applicationResult.error) throw applicationResult.error;
  return {
    applications: (applicationResult.data ?? []) as DealerDashboardApplication[],
    offers: (recentOffers.data ?? []) as DealerDashboardOffer[],
    applicationCount: applicationsCount.count ?? 0,
    pendingCount: pendingCount.count ?? 0,
    offeredCount: offeredCount.count ?? 0,
    soldCount: soldCount.count ?? 0,
    offerCount: offersCount.count ?? 0,
  };
}

export async function getDealerApplicationForCurrentUser(applicationId: string): Promise<ApplicationRow | null> {
  if (isLocalDataMode()) return getLocalDealerApplicationForCurrentUser(applicationId);

  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("dealer_id", dealer.dealer_id)
    .not("submitted_at", "is", null)
    .maybeSingle();
  if (error) throw error;
  return (data as ApplicationRow | null) ?? null;
}

export async function listUsersForAdmin() {
  if (isLocalDataMode()) return listLocalUsersForAdmin();

  const supabase = createSupabaseServiceClient();
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("user_id, full_name, must_change_password, is_active, created_at")
    .order("created_at", { ascending: false });
  if (profilesError) throw profilesError;

  const safeProfiles =
    (profiles as { user_id: string; full_name: string | null; must_change_password: boolean; is_active: boolean; created_at: string }[]) ??
    [];

  const userIds = safeProfiles.map((p) => p.user_id);
  if (userIds.length === 0) return [];

  const [{ data: roleRows, error: rolesError }, { data: memberships, error: membershipError }] =
    await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      supabase.from("dealer_users").select("user_id, dealer_id").in("user_id", userIds),
    ]);

  if (rolesError) throw rolesError;
  if (membershipError) throw membershipError;

  const safeRoles = (roleRows as { user_id: string; role: string }[]) ?? [];
  const safeMemberships = (memberships as { user_id: string; dealer_id: string }[]) ?? [];
  const emailByUserId = new Map<string, string>();

  for (let page = 1; page <= 10 && emailByUserId.size < userIds.length; page += 1) {
    const { data: authPage, error: authError } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (authError) throw authError;

    for (const authUser of authPage.users) {
      if (authUser.email) emailByUserId.set(authUser.id, authUser.email);
    }
    if (authPage.users.length < 200) break;
  }

  return safeProfiles.map((profile) => ({
    ...profile,
    email: emailByUserId.get(profile.user_id) ?? null,
    roles: safeRoles.filter((r) => r.user_id === profile.user_id).map((r) => r.role),
    dealer_ids: safeMemberships.filter((m) => m.user_id === profile.user_id).map((m) => m.dealer_id),
  }));
}

export async function getAdminDashboardCounts(): Promise<{
  applications: number;
  dealers: number;
  offers: number;
}> {
  if (isLocalDataMode()) return getLocalAdminDashboardCounts();

  const supabase = createSupabaseServiceClient();
  const [{ count: applications }, { count: dealers }, { count: offers }] = await Promise.all([
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase.from("dealers").select("*", { count: "exact", head: true }),
    supabase.from("offers").select("*", { count: "exact", head: true }),
  ]);

  return {
    applications: applications ?? 0,
    dealers: dealers ?? 0,
    offers: offers ?? 0,
  };
}
