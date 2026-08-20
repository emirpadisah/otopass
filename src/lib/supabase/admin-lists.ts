import type { PaginationInput, PaginatedResult } from "@/lib/types";
import { safeSearchTerm } from "@/lib/pagination";
import type { Database } from "./database.types";
import { createSupabaseServiceClient } from "./service";

type Application = Database["public"]["Tables"]["applications"]["Row"] & { dealer_name: string };
type Offer = Database["public"]["Tables"]["offers"]["Row"] & { dealer_name: string; application_reference: string | null };
type Activity = Database["public"]["Tables"]["activity_log"]["Row"];

function result<T>(items: T[], count: number | null, input: PaginationInput): PaginatedResult<T> {
  const total = count ?? 0;
  return { items, total, page: input.page, pageSize: input.pageSize, pageCount: Math.max(1, Math.ceil(total / input.pageSize)) };
}

export async function listAdminApplications(input: PaginationInput): Promise<PaginatedResult<Application>> {
  const supabase = createSupabaseServiceClient();
  const from = (input.page - 1) * input.pageSize;
  let query = supabase.from("applications").select("*", { count: "exact" }).not("submitted_at", "is", null);
  if (input.status) query = query.eq("status", input.status);
  const q = safeSearchTerm(input.q || "");
  if (q) query = query.or(`reference_code.ilike.%${q}%,owner_name.ilike.%${q}%,owner_phone.ilike.%${q}%,owner_email.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`);
  const { data, count, error } = await query.order("created_at", { ascending: input.sort === "oldest" }).range(from, from + input.pageSize - 1);
  if (error) throw error;
  const rows = data ?? [];
  const dealerIds = [...new Set(rows.map((row) => row.dealer_id))];
  const { data: dealers } = dealerIds.length ? await supabase.from("dealers").select("id, name").in("id", dealerIds) : { data: [] };
  const names = new Map((dealers ?? []).map((dealer) => [dealer.id, dealer.name]));
  return result(rows.map((row) => ({ ...row, dealer_name: names.get(row.dealer_id) || "-" })), count, input);
}

export async function listAdminOffers(input: PaginationInput): Promise<PaginatedResult<Offer>> {
  const supabase = createSupabaseServiceClient();
  const from = (input.page - 1) * input.pageSize;
  let query = supabase.from("offers").select("*", { count: "exact" });
  if (input.status) query = query.eq("status", input.status);
  const q = safeSearchTerm(input.q || "");
  if (q) query = query.ilike("notes", `%${q}%`);
  const { data, count, error } = await query.order("created_at", { ascending: input.sort === "oldest" }).range(from, from + input.pageSize - 1);
  if (error) throw error;
  const rows = data ?? [];
  const dealerIds = [...new Set(rows.map((row) => row.dealer_id))];
  const appIds = [...new Set(rows.map((row) => row.application_id))];
  const [{ data: dealers }, { data: applications }] = await Promise.all([
    dealerIds.length ? supabase.from("dealers").select("id, name").in("id", dealerIds) : Promise.resolve({ data: [] }),
    appIds.length ? supabase.from("applications").select("id, reference_code").in("id", appIds) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map((dealers ?? []).map((dealer) => [dealer.id, dealer.name]));
  const refs = new Map((applications ?? []).map((application) => [application.id, application.reference_code]));
  return result(rows.map((row) => ({ ...row, dealer_name: names.get(row.dealer_id) || "-", application_reference: refs.get(row.application_id) || null })), count, input);
}

export async function listAdminActivity(input: PaginationInput): Promise<PaginatedResult<Activity>> {
  const supabase = createSupabaseServiceClient();
  const from = (input.page - 1) * input.pageSize;
  let query = supabase.from("activity_log").select("*", { count: "exact" });
  const q = safeSearchTerm(input.q || "");
  if (q) query = query.ilike("action", `%${q}%`);
  const { data, count, error } = await query.order("created_at", { ascending: input.sort === "oldest" }).range(from, from + input.pageSize - 1);
  if (error) throw error;
  return result(data ?? [], count, input);
}
