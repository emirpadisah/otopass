import { createSupabaseServerClient } from "./server";
import { createSupabaseServiceClient } from "./service";
import type { Database } from "./database.types";
import type { UserRole } from "@/lib/types";

type DealerRow = Database["public"]["Tables"]["dealers"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];

type DealerLinkRow = {
  dealer_id: string;
  role: string;
  created_at: string;
};

export type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];

export async function getDealerBySlug(slug: string): Promise<DealerRow | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("dealers").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as DealerRow | null) ?? null;
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user?.id ?? null;
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.role as UserRole);
}

export async function listDealers(): Promise<DealerRow[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("dealers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DealerRow[]) ?? [];
}

export async function getDealerForCurrentUser() {
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

  return {
    dealer_id: row.dealer_id,
    role: row.role,
  };
}

export async function getDealerForCurrentUserWithDetails() {
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
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ApplicationRow[]) ?? [];
}

export async function listDealerApplicationsForCurrentUser(): Promise<ApplicationRow[]> {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) return [];
  return listDealerApplications(dealer.dealer_id);
}

export async function getDealerApplicationForCurrentUser(applicationId: string): Promise<ApplicationRow | null> {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("dealer_id", dealer.dealer_id)
    .maybeSingle();
  if (error) throw error;
  return (data as ApplicationRow | null) ?? null;
}

export async function listUsersForAdmin() {
  const supabase = createSupabaseServiceClient();
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("user_id, full_name, must_change_password, created_at")
    .order("created_at", { ascending: false });
  if (profilesError) throw profilesError;

  const safeProfiles =
    (profiles as { user_id: string; full_name: string | null; must_change_password: boolean; created_at: string }[]) ??
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

  return safeProfiles.map((profile) => ({
    ...profile,
    roles: safeRoles.filter((r) => r.user_id === profile.user_id).map((r) => r.role),
    dealer_ids: safeMemberships.filter((m) => m.user_id === profile.user_id).map((m) => m.dealer_id),
  }));
}
