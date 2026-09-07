// Hand-authored until `supabase gen types typescript` is run against the live
// project (see README). Keep in sync with supabase/migrations.

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type CategoryGender = "men" | "women" | "unisex";
export type UserRole = "customer" | "admin";

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  gender: CategoryGender;
  sort: number;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  duration_min: number;
  price_cents: number;
  deposit_cents: number | null;
  photo_url: string | null;
  online_booking: boolean;
  popular: boolean;
  active: boolean;
}

export interface Staff {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  bio: string | null;
  title: string | null;
  active: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  email: string | null;
  birthday: string | null;
  gender: string | null;
  preferred_staff_id: string | null;
  notification_prefs: Record<string, boolean>;
  role: UserRole;
  created_at: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  service_id: string;
  staff_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price_cents: number;
  cancellation_reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AvailableSlot {
  starts_at: string;
  staff_id: string;
}

export interface Review {
  id: string;
  appointment_id: string;
  customer_id: string;
  staff_id: string | null;
  service_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Rating {
  rating: number;
  review_count: number;
}

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: Row<Profile>;
      service_categories: Row<ServiceCategory>;
      services: Row<Service>;
      staff: Row<Staff>;
      staff_services: Row<{ staff_id: string; service_id: string }>;
      staff_working_hours: Row<{
        id: string;
        staff_id: string;
        weekday: number;
        start_time: string;
        end_time: string;
      }>;
      staff_time_off: Row<{
        id: string;
        staff_id: string;
        starts_at: string;
        ends_at: string;
        reason: string | null;
      }>;
      appointments: Row<Appointment>;
    };
    Views: Record<string, never>;
    Functions: {
      get_available_slots: {
        Args: { p_service_id: string; p_staff_id: string | null; p_day: string };
        Returns: AvailableSlot[];
      };
      book_appointment: {
        Args: { p_service_id: string; p_staff_id: string | null; p_starts_at: string };
        Returns: Appointment;
      };
      reschedule_appointment: {
        Args: { p_appointment_id: string; p_staff_id: string | null; p_starts_at: string };
        Returns: Appointment;
      };
      cancel_appointment: {
        Args: { p_appointment_id: string; p_reason: string | null };
        Returns: Appointment;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      appointment_status: AppointmentStatus;
      category_gender: CategoryGender;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
