export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type DealerRow = {
  id: string;
  name: string;
  slug: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  social_links: Json;
  legal_name: string | null;
  privacy_contact_email: string | null;
  logo_url: string | null;
  brand_color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
};

type ApplicationRow = {
  id: string;
  dealer_id: string;
  dealer_slug: string;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  brand: string;
  model: string;
  vehicle_package: string | null;
  model_year: number | null;
  km: number | null;
  fuel_type: string | null;
  transmission: string | null;
  tramer_info: string | null;
  damage_info: string | null;
  body_condition: Json;
  photo_paths: string[];
  reference_code: string | null;
  status: string;
  submitted_at: string | null;
  privacy_version: string | null;
  privacy_acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  purged_at: string | null;
};

type OfferRow = {
  id: string;
  application_id: string;
  dealer_id: string;
  amount: number;
  currency: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  responded_by: string | null;
};

type DealerDomainRow = {
  id: string;
  dealer_id: string;
  hostname: string;
  status: "pending" | "misconfigured" | "verified" | "error";
  verification: Json;
  dns_records: Json;
  last_error: string | null;
  verified_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

type TableShape<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      dealers: TableShape<DealerRow, Partial<DealerRow> & Pick<DealerRow, "name" | "slug">>;
      dealer_domains: TableShape<
        DealerDomainRow,
        Partial<DealerDomainRow> & Pick<DealerDomainRow, "dealer_id" | "hostname">
      >;
      applications: TableShape<
        ApplicationRow,
        Partial<ApplicationRow> & Pick<ApplicationRow, "dealer_id" | "dealer_slug" | "brand" | "model">
      >;
      dealer_users: TableShape<{
        id: string;
        user_id: string;
        dealer_id: string;
        role: string;
        created_at: string;
      }>;
      user_roles: TableShape<{ user_id: string; role: string; created_at: string }>;
      user_profiles: TableShape<{
        user_id: string;
        full_name: string | null;
        must_change_password: boolean;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        deactivated_at: string | null;
      }>;
      offers: TableShape<OfferRow, Partial<OfferRow> & Pick<OfferRow, "application_id" | "dealer_id" | "amount">>;
      activity_log: TableShape<{
        id: number;
        actor_user_id: string | null;
        dealer_id: string | null;
        application_id: string | null;
        offer_id: string | null;
        action: string;
        metadata: Json;
        created_at: string;
      }>;
      form_rate_limits: TableShape<{ id: number; ip_hash: string; dealer_slug: string; created_at: string }>;
      rate_limit_buckets: TableShape<{
        scope: string;
        key_hash: string;
        bucket_start: string;
        request_count: number;
        expires_at: string;
      }>;
      upload_sessions: TableShape<{
        id: string;
        application_id: string;
        finalize_token_hash: string;
        status: string;
        expires_at: string;
        created_at: string;
        completed_at: string | null;
      }>;
      upload_items: TableShape<{
        id: string;
        session_id: string;
        object_path: string;
        original_name: string;
        content_type: string;
        expected_size: number;
        sort_order: number;
        created_at: string;
      }>;
      app_settings: TableShape<{ key: string; value: Json; updated_at: string; updated_by: string | null }>;
      migration_issues: TableShape<{
        id: number;
        migration_name: string;
        table_name: string;
        row_id: string | null;
        issue: string;
        original_value: Json;
        resolution: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      consume_rate_limit: {
        Args: { p_scope: string; p_key_hash: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      create_dealer_offer: {
        Args: { p_application_id: string; p_amount: number; p_currency?: string; p_notes?: string | null };
        Returns: OfferRow;
      };
      respond_to_dealer_offer: {
        Args: { p_offer_id: string; p_response: string; p_note?: string | null };
        Returns: OfferRow;
      };
      mark_dealer_application_sold: {
        Args: { p_application_id: string };
        Returns: ApplicationRow;
      };
      delete_application_for_current_user: {
        Args: { p_application_id: string };
        Returns: string[];
      };
      finalize_public_application: {
        Args: { p_session_id: string; p_photo_paths: string[] };
        Returns: ApplicationRow;
      };
      admin_update_user_access: {
        Args: { p_user_id: string; p_full_name: string; p_role: string; p_dealer_id: string | null; p_is_active: boolean };
        Returns: undefined;
      };
      resolve_dealer_domain: {
        Args: { p_hostname: string };
        Returns: { dealer_slug: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
