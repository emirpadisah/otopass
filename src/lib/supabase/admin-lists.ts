import "server-only";

import { requireAdminAccess } from "@/lib/auth/roles";
import type { PaginationInput, PaginatedResult } from "@/lib/types";
import { safeSearchTerm } from "@/lib/pagination";
import type { Database } from "./database.types";
import { createSupabaseServiceClient } from "./service";

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type Application = Pick<ApplicationRow, "id" | "dealer_id" | "reference_code" | "owner_name" | "owner_phone" | "brand" | "model" | "status" | "created_at"> & { dealer_name: string };
type Offer = Pick<OfferRow, "id" | "application_id" | "dealer_id" | "amount" | "currency" | "status" | "responded_at" | "created_at"> & { dealer_name: string; application_reference: string | null };
type Activity = Database["public"]["Tables"]["activity_log"]["Row"];

function result<T>(items: T[], count: number | null, input: PaginationInput): PaginatedResult<T> {
  const total = count ?? 0;
  return { items, total, page: input.page, pageSize: input.pageSize, pageCount: Math.max(1, Math.ceil(total / input.pageSize)) };
}

export async function listAdminApplications(input: PaginationInput): Promise<PaginatedResult<Application>> {
  await requireAdminAccess();
  const supabase = createSupabaseServiceClient();
  const from = (input.page - 1) * input.pageSize;
  let query = supabase.from("applications").select("id, dealer_id, reference_code, owner_name, owner_phone, brand, model, status, created_at, dealers!applications_dealer_id_fkey(name)", { count: "exact" }).not("submitted_at", "is", null);
  if (input.status) query = query.eq("status", input.status);
  const q = safeSearchTerm(input.q || "");
  if (q) query = query.or(`reference_code.ilike.%${q}%,owner_name.ilike.%${q}%,owner_phone.ilike.%${q}%,owner_email.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`);
  const { data, count, error } = await query.order("created_at", { ascending: input.sort === "oldest" }).range(from, from + input.pageSize - 1);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<Omit<Application, "dealer_name"> & { dealers: { name: string } | null }>;
  return result(rows.map(({ dealers, ...row }) => ({ ...row, dealer_name: dealers?.name || "-" })), count, input);
}

export async function listAdminOffers(input: PaginationInput): Promise<PaginatedResult<Offer>> {
  await requireAdminAccess();
  const supabase = createSupabaseServiceClient();
  const from = (input.page - 1) * input.pageSize;
  let query = supabase.from("offers").select("id, application_id, dealer_id, amount, currency, status, responded_at, created_at, dealers!offers_dealer_id_fkey(name), applications!offers_application_id_fkey(reference_code)", { count: "exact" });
  if (input.status) query = query.eq("status", input.status);
  const q = safeSearchTerm(input.q || "");
  if (q) query = query.ilike("notes", `%${q}%`);
  const { data, count, error } = await query.order("created_at", { ascending: input.sort === "oldest" }).range(from, from + input.pageSize - 1);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<Omit<Offer, "dealer_name" | "application_reference"> & {
    dealers: { name: string } | null;
    applications: { reference_code: string | null } | null;
  }>;
  return result(rows.map(({ dealers, applications, ...row }) => ({
    ...row,
    dealer_name: dealers?.name || "-",
    application_reference: applications?.reference_code ?? null,
  })), count, input);
}

export async function listAdminActivity(input: PaginationInput): Promise<PaginatedResult<Activity>> {
  await requireAdminAccess();
  const supabase = createSupabaseServiceClient();
  const from = (input.page - 1) * input.pageSize;
  let query = supabase.from("activity_log").select("*", { count: "exact" });
  const q = safeSearchTerm(input.q || "");
  if (q) query = query.ilike("action", `%${q}%`);
  const { data, count, error } = await query.order("created_at", { ascending: input.sort === "oldest" }).range(from, from + input.pageSize - 1);
  if (error) throw error;
  return result(data ?? [], count, input);
}
