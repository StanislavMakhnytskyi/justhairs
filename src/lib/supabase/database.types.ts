// Same shape as `supabase gen types typescript` produces, so the real generated
// file can replace this one: after applying the migrations to the live project,
// run `npm run types:gen` (needs `supabase login`) and commit the result.
//
// Until then this is maintained by hand to match supabase/migrations 0001–0008
// (0008 = the auth-era columns are gone). Domain aliases live in ./types.ts.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: { cancel_window_hours: number; id: boolean; slot_step_min: number; timezone: string };
        Insert: { cancel_window_hours?: number; id?: boolean; slot_step_min?: number; timezone?: string };
        Update: { cancel_window_hours?: number; id?: boolean; slot_step_min?: number; timezone?: string };
        Relationships: [];
      };
      appointments: {
        Row: {
          cancellation_reason: string | null;
          confirmation_code: string | null;
          created_at: string;
          customer_email: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          ends_at: string;
          id: string;
          payment_status: string;
          price_cents: number;
          service_id: string;
          staff_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          stripe_session_id: string | null;
        };
        Insert: {
          cancellation_reason?: string | null;
          confirmation_code?: string | null;
          created_at?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          ends_at: string;
          id?: string;
          payment_status?: string;
          price_cents: number;
          service_id: string;
          staff_id?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          stripe_session_id?: string | null;
        };
        Update: {
          cancellation_reason?: string | null;
          confirmation_code?: string | null;
          created_at?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          ends_at?: string;
          id?: string;
          payment_status?: string;
          price_cents?: number;
          service_id?: string;
          staff_id?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          stripe_session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          appointment_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          reviewer_first: string | null;
          service_id: string | null;
          staff_id: string | null;
        };
        Insert: {
          appointment_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          reviewer_first?: string | null;
          service_id?: string | null;
          staff_id?: string | null;
        };
        Update: {
          appointment_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          reviewer_first?: string | null;
          service_id?: string | null;
          staff_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: true;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          gender: Database["public"]["Enums"]["category_gender"];
          id: string;
          name: string;
          slug: string;
          sort: number;
        };
        Insert: {
          gender: Database["public"]["Enums"]["category_gender"];
          id?: string;
          name: string;
          slug: string;
          sort?: number;
        };
        Update: {
          gender?: Database["public"]["Enums"]["category_gender"];
          id?: string;
          name?: string;
          slug?: string;
          sort?: number;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          category_id: string;
          deposit_cents: number | null;
          description: string | null;
          duration_min: number;
          id: string;
          name: string;
          online_booking: boolean;
          photo_url: string | null;
          popular: boolean;
          price_cents: number;
          slug: string;
        };
        Insert: {
          active?: boolean;
          category_id: string;
          deposit_cents?: number | null;
          description?: string | null;
          duration_min: number;
          id?: string;
          name: string;
          online_booking?: boolean;
          photo_url?: string | null;
          popular?: boolean;
          price_cents: number;
          slug: string;
        };
        Update: {
          active?: boolean;
          category_id?: string;
          deposit_cents?: number | null;
          description?: string | null;
          duration_min?: number;
          id?: string;
          name?: string;
          online_booking?: boolean;
          photo_url?: string | null;
          popular?: boolean;
          price_cents?: number;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          active: boolean;
          bio: string | null;
          id: string;
          name: string;
          photo_url: string | null;
          slug: string;
          title: string | null;
        };
        Insert: {
          active?: boolean;
          bio?: string | null;
          id?: string;
          name: string;
          photo_url?: string | null;
          slug: string;
          title?: string | null;
        };
        Update: {
          active?: boolean;
          bio?: string | null;
          id?: string;
          name?: string;
          photo_url?: string | null;
          slug?: string;
          title?: string | null;
        };
        Relationships: [];
      };
      staff_services: {
        Row: { service_id: string; staff_id: string };
        Insert: { service_id: string; staff_id: string };
        Update: { service_id?: string; staff_id?: string };
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_time_off: {
        Row: { ends_at: string; id: string; reason: string | null; staff_id: string; starts_at: string };
        Insert: { ends_at: string; id?: string; reason?: string | null; staff_id: string; starts_at: string };
        Update: { ends_at?: string; id?: string; reason?: string | null; staff_id?: string; starts_at?: string };
        Relationships: [
          {
            foreignKeyName: "staff_time_off_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_working_hours: {
        Row: { end_time: string; id: string; staff_id: string; start_time: string; weekday: number };
        Insert: { end_time: string; id?: string; staff_id: string; start_time: string; weekday: number };
        Update: { end_time?: string; id?: string; staff_id?: string; start_time?: string; weekday?: number };
        Relationships: [
          {
            foreignKeyName: "staff_working_hours_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      overall_rating: {
        Row: { rating: number | null; review_count: number | null };
        Relationships: [];
      };
      public_reviews: {
        Row: {
          comment: string | null;
          created_at: string | null;
          id: string | null;
          rating: number | null;
          reviewer_first: string | null;
          service_id: string | null;
          service_name: string | null;
          staff_id: string | null;
          staff_name: string | null;
        };
        Relationships: [];
      };
      service_ratings: {
        Row: { rating: number | null; review_count: number | null; service_id: string | null };
        Relationships: [];
      };
      staff_ratings: {
        Row: { rating: number | null; review_count: number | null; staff_id: string | null };
        Relationships: [];
      };
    };
    Functions: {
      book_appointment: {
        Args: { p_service_id: string; p_staff_id: string | null; p_starts_at: string };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      complete_past_appointments: { Args: Record<PropertyKey, never>; Returns: number };
      gen_confirmation_code: { Args: Record<PropertyKey, never>; Returns: string };
      get_available_slots: {
        Args: { p_day: string; p_service_id: string; p_staff_id: string | null };
        Returns: { staff_id: string; starts_at: string }[];
      };
      get_day_availability: {
        Args: { p_days: number; p_from: string; p_service_id: string; p_staff_id: string | null };
        Returns: { staff_id: string; starts_at: string }[];
      };
      release_stale_holds: { Args: Record<PropertyKey, never>; Returns: number };
    };
    Enums: {
      appointment_status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
      category_gender: "men" | "women" | "unisex";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type DefaultSchema = Database["public"];

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"];
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T];
