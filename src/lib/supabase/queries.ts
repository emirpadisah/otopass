import "server-only";

import { cache } from "react";
import { getRequestAccessContext } from "@/lib/auth/access-context";
import { requireAdminAccess } from "@/lib/auth/roles";
import { createSupabaseServiceClient } from "./service";
import type { Database } from "./database.types";
import { isLocalDataMode } from "@/lib/data-mode";
import {
  getLocalAdminDashboardCounts,
  getLocalDealerApplicationForCurrentUser,
  getLocalDealerById,
  getLocalDealerBySlug,
  getLocalUserRoles,
  listLocalDealerApplications,
  listLocalDealerOffers,
  listLocalDealers,
  listLocalUsersForAdmin,
} from "@/lib/local/repository";
import type { ApplicationStatus, PaginatedResult, PaginationInput, UserRole } from "@/lib/types";
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

export type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];

export async function getDealerBySlug(slug: string): Promise<DealerRow | null> {
  if (isLocalDataMode()) {
    const dealer = await getLocalDealerBySlug(slug);
    return dealer?.is_active === false ? null : dealer;
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("dealers").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) throw error;
  return (data as DealerRow | null) ?? null;
}

export async function getDealerById(id: string): Promise<DealerRow | null> {
  if (isLocalDataMode()) return getLocalDealerById(id);

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("dealers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as DealerRow | null) ?? null;
}

export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const context = await getRequestAccessContext();
  return context?.isActive ? context.user.id : null;
});

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  if (isLocalDataMode()) return getLocalUserRoles(userId);

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.role as UserRole);
}

export async function listDealers(): Promise<DealerRow[]> {
  await requireAdminAccess();
  if (isLocalDataMode()) return listLocalDealers();

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("dealers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DealerRow[]) ?? [];
}

export const getDealerForCurrentUser = cache(async () => {
  const context = await getRequestAccessContext();
  if (!context?.isActive || !context.dealerId || !context.membershipRole) return null;
  return { dealer_id: context.dealerId, role: context.membershipRole };
});

export async function getDealerForCurrentUserWithDetails() {
  const context = await getRequestAccessContext();
  return context?.isActive ? context.dealer : null;
}

export async function listDealerOptionsForAdmin(): Promise<Array<{ id: string; name: string }>> {
  await requireAdminAccess();
  if (isLocalDataMode()) {
    return (await listLocalDealers())
      .filter((dealer) => dealer.is_active)
      .map(({ id, name }) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("dealers")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getDealerDomainByDealerId(dealerId: string): Promise<DealerDomainRow | null | undefined> {
  if (isLocalDataMode()) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("dealer_domains")
    .select("*")
    .eq("dealer_id", dealerId)
    .maybeSingle();
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
  const { data: rpcData, error } = await supabase.rpc("get_dealer_application_page", {
    p_dealer_id: dealerId,
    p_query: q,
    p_status: activeStatus,
    p_sort: input.sort === "oldest" ? "oldest" : "newest",
    p_offset: from,
    p_limit: input.pageSize,
  });
  if (error) throw error;
  const payload = rpcData as unknown as {
    items?: Array<DealerApplicationListRow & { latest_offer: number | null }>;
    total?: number;
    statusCounts?: Partial<Record<ApplicationStatus, number>>;
  };
  const rpcItems = payload.items ?? [];
  const items = rpcItems.map((item) => ({
    id: item.id,
    reference_code: item.reference_code,
    owner_name: item.owner_name,
    owner_phone: item.owner_phone,
    brand: item.brand,
    model: item.model,
    model_year: item.model_year,
    km: item.km,
    status: item.status,
    created_at: item.created_at,
  }));
  const counts = { ...emptyStatusCounts(), ...(payload.statusCounts ?? {}) };
  const latestOfferByApplication = Object.fromEntries(
    rpcItems.filter((item) => item.latest_offer !== null).map((item) => [item.id, Number(item.latest_offer)]),
  );
  const total = Number(payload.total ?? 0);
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
  const { data: rpcData, error } = await supabase.rpc("get_dealer_dashboard_snapshot", { p_dealer_id: dealerId });
  if (error) throw error;
  const payload = rpcData as unknown as {
    applicationCount?: number;
    pendingCount?: number;
    offeredCount?: number;
    soldCount?: number;
    offerCount?: number;
    recentOffers?: Array<DealerDashboardOffer & { brand: string | null; model: string | null }>;
  };
  const recentOffers = payload.recentOffers ?? [];
  return {
    applications: recentOffers.map((offer) => ({ id: offer.application_id, brand: offer.brand ?? "", model: offer.model ?? "" })),
    offers: recentOffers.map((offer) => ({
      id: offer.id,
      application_id: offer.application_id,
      amount: offer.amount,
      created_at: offer.created_at,
    })),
    applicationCount: Number(payload.applicationCount ?? 0),
    pendingCount: Number(payload.pendingCount ?? 0),
    offeredCount: Number(payload.offeredCount ?? 0),
    soldCount: Number(payload.soldCount ?? 0),
    offerCount: Number(payload.offerCount ?? 0),
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
  await requireAdminAccess();
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

export type AdminUserListRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  roles: string[];
  dealer_ids: string[];
};

export type AdminUserPage = PaginatedResult<AdminUserListRow> & { passwordResetCount: number };

export async function getAdminUser(userId: string): Promise<AdminUserListRow | null> {
  await requireAdminAccess();
  if (isLocalDataMode()) {
    return (await listLocalUsersForAdmin()).find((user) => user.user_id === userId) as AdminUserListRow | undefined ?? null;
  }
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("admin_get_user", { p_user_id: userId });
  if (error) throw error;
  return data as unknown as AdminUserListRow | null;
}

export async function listAdminUsersPage(input: PaginationInput): Promise<AdminUserPage> {
  await requireAdminAccess();
  const q = safeSearchTerm(input.q || "");
  const status = input.status === "active" || input.status === "inactive" ? input.status : null;
  const from = (input.page - 1) * input.pageSize;

  if (isLocalDataMode()) {
    const users = await listLocalUsersForAdmin();
    const normalizedQuery = q.toLocaleLowerCase("tr-TR");
    const filtered = users
      .filter((user) => !status || (status === "active" ? user.is_active : !user.is_active))
      .filter((user) => !normalizedQuery || [user.email, user.full_name, ...user.roles]
        .some((value) => value?.toLocaleLowerCase("tr-TR").includes(normalizedQuery)))
      .sort((a, b) => input.sort === "oldest" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
    const items = filtered.slice(from, from + input.pageSize) as AdminUserListRow[];
    return {
      items,
      total: filtered.length,
      page: input.page,
      pageSize: input.pageSize,
      pageCount: Math.max(1, Math.ceil(filtered.length / input.pageSize)),
      passwordResetCount: filtered.filter((user) => user.must_change_password).length,
    };
  }

  const supabase = createSupabaseServiceClient();
  const { data: rpcData, error } = await supabase.rpc("admin_list_users_page", {
    p_query: q,
    p_status: status,
    p_sort: input.sort === "oldest" ? "oldest" : "newest",
    p_offset: from,
    p_limit: input.pageSize,
  });
  if (error) throw error;
  const payload = rpcData as unknown as { items?: AdminUserListRow[]; total?: number; passwordResetCount?: number };
  const total = Number(payload.total ?? 0);
  return {
    items: payload.items ?? [],
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    passwordResetCount: Number(payload.passwordResetCount ?? 0),
  };
}

export async function listAdminDealersPage(input: PaginationInput): Promise<PaginatedResult<DealerRow>> {
  await requireAdminAccess();
  const q = safeSearchTerm(input.q || "");
  const status = input.status === "active" || input.status === "inactive" ? input.status : null;
  const from = (input.page - 1) * input.pageSize;

  if (isLocalDataMode()) {
    const dealers = await listLocalDealers();
    const normalizedQuery = q.toLocaleLowerCase("tr-TR");
    const filtered = dealers
      .filter((dealer) => !status || (status === "active" ? dealer.is_active : !dealer.is_active))
      .filter((dealer) => !normalizedQuery || [dealer.name, dealer.slug, dealer.contact_email, dealer.legal_name]
        .some((value) => value?.toLocaleLowerCase("tr-TR").includes(normalizedQuery)))
      .sort((a, b) => input.sort === "oldest" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
    const items = filtered.slice(from, from + input.pageSize);
    return {
      items,
      total: filtered.length,
      page: input.page,
      pageSize: input.pageSize,
      pageCount: Math.max(1, Math.ceil(filtered.length / input.pageSize)),
    };
  }

  const supabase = createSupabaseServiceClient();
  const { data: rpcData, error } = await supabase.rpc("admin_list_dealers_page", {
    p_query: q,
    p_status: status,
    p_sort: input.sort === "oldest" ? "oldest" : "newest",
    p_offset: from,
    p_limit: input.pageSize,
  });
  if (error) throw error;
  const payload = rpcData as unknown as { items?: DealerRow[]; total?: number };
  const total = Number(payload.total ?? 0);
  return {
    items: payload.items ?? [],
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function getAdminDashboardCounts(): Promise<{
  applications: number;
  dealers: number;
  offers: number;
}> {
  await requireAdminAccess();
  if (isLocalDataMode()) return getLocalAdminDashboardCounts();

  const supabase = createSupabaseServiceClient();
  const { data: rpcData, error } = await supabase.rpc("get_admin_dashboard_snapshot");
  if (error) throw error;
  const payload = rpcData as unknown as { applications?: number; dealers?: number; offers?: number };
  return {
    applications: Number(payload.applications ?? 0),
    dealers: Number(payload.dealers ?? 0),
    offers: Number(payload.offers ?? 0),
  };
}
