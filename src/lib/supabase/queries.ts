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
import type { UserRole } from "@/lib/types";
import { isMissingColumn } from "./schema-compat";

type DealerRow = Database["public"]["Tables"]["dealers"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];

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

export async function getCurrentUserId(): Promise<string | null> {
  if (isLocalDataMode()) return getLocalCurrentUserId();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user?.id ?? null;
}

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

export async function getDealerForCurrentUser() {
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
}

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
