// Domain names for the generated database types (see ./database.types.ts).
// Prefer these in app code; reach for Tables<>/Enums<> only for new tables.
import type { Enums, Tables } from "./database.types";

export type { Database, Json, Enums, Tables, TablesInsert, TablesUpdate } from "./database.types";

export type AppointmentStatus = Enums<"appointment_status">;
export type CategoryGender = Enums<"category_gender">;
/** `payment_status` is a text column with a CHECK constraint, so the generated type is `string`. */
export type PaymentStatus = "unpaid" | "pay_later" | "paid";

export type ServiceCategory = Tables<"service_categories">;
export type Service = Tables<"services">;
export type Staff = Tables<"staff">;
export type Review = Tables<"reviews">;
export type Appointment = Omit<Tables<"appointments">, "payment_status"> & {
  payment_status: PaymentStatus;
};

export interface AvailableSlot {
  starts_at: string;
  staff_id: string;
}

export interface Rating {
  rating: number;
  review_count: number;
}

