export type UserRole =
  | "super_admin"
  | "admin"
  | "dealer_owner"
  | "dealer_manager"
  | "dealer_viewer";

export type AuthRedirectTarget = "/admin" | "/dealer" | "/login";

export type DealerMembership = {
  dealer_id: string;
  role: Exclude<UserRole, "super_admin" | "admin">;
};

export type ApplicationInput = {
  dealer_slug: string;
  owner_name: string | null;
  owner_phone: string | null;
  brand: string;
  model: string;
  vehicle_package: string | null;
  model_year: number | null;
  km: number | null;
  fuel_type: string | null;
  transmission: string | null;
  tramer_info: string | null;
  damage_info: string | null;
};

export type ActionResponse = {
  ok: boolean;
  code?: string;
  message?: string;
};
