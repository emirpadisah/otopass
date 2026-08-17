export type UserRole =
  | "super_admin"
  | "admin"
  | "dealer_owner"
  | "dealer_manager"
  | "dealer_viewer";

export type DealerRole = "owner" | "manager" | "viewer";
export type ApplicationStatus = "pending" | "offered" | "accepted" | "rejected" | "sold" | "archived";
export type OfferStatus = "pending" | "accepted" | "rejected";

export type AuthRedirectTarget = "/admin" | "/dealer" | "/login";

export type DealerMembership = {
  dealer_id: string;
  role: Exclude<UserRole, "super_admin" | "admin">;
};

export type ApplicationInput = {
  dealer_slug: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  brand: string;
  model: string;
  vehicle_package: string | null;
  model_year: number | null;
  km: number | null;
  fuel_type: string | null;
  transmission: string | null;
  tramer_info: string | null;
  damage_info: string | null;
  privacy_acknowledged: boolean;
  marketing_consent: boolean;
};

export type PaginationInput = {
  q?: string;
  status?: string;
  page: number;
  pageSize: number;
  sort?: string;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ActionResponse = {
  ok: boolean;
  code?: string;
  message?: string;
};
