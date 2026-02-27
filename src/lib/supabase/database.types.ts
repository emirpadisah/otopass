export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      dealers: {
        Row: {
          id: string;
          name: string;
          slug: string;
          contact_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          contact_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          contact_email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          dealer_id: string;
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
          photo_paths: string[];
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          dealer_id: string;
          dealer_slug: string;
          owner_name?: string | null;
          owner_phone?: string | null;
          brand: string;
          model: string;
          vehicle_package?: string | null;
          model_year?: number | null;
          km?: number | null;
          fuel_type?: string | null;
          transmission?: string | null;
          tramer_info?: string | null;
          damage_info?: string | null;
          photo_paths?: string[];
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          dealer_id?: string;
          dealer_slug?: string;
          owner_name?: string | null;
          owner_phone?: string | null;
          brand?: string;
          model?: string;
          vehicle_package?: string | null;
          model_year?: number | null;
          km?: number | null;
          fuel_type?: string | null;
          transmission?: string | null;
          tramer_info?: string | null;
          damage_info?: string | null;
          photo_paths?: string[];
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      dealer_users: {
        Row: {
          id: string;
          user_id: string;
          dealer_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dealer_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dealer_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          must_change_password: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          must_change_password?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          must_change_password?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      offers: {
        Row: {
          id: string;
          application_id: string;
          dealer_id: string;
          amount: number;
          currency: string;
          notes: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          dealer_id: string;
          amount: number;
          currency?: string;
          notes?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          dealer_id?: string;
          amount?: number;
          currency?: string;
          notes?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: number;
          actor_user_id: string | null;
          dealer_id: string | null;
          application_id: string | null;
          offer_id: string | null;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          actor_user_id?: string | null;
          dealer_id?: string | null;
          application_id?: string | null;
          offer_id?: string | null;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          actor_user_id?: string | null;
          dealer_id?: string | null;
          application_id?: string | null;
          offer_id?: string | null;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      form_rate_limits: {
        Row: {
          id: number;
          ip_hash: string;
          dealer_slug: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          ip_hash: string;
          dealer_slug: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          ip_hash?: string;
          dealer_slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
