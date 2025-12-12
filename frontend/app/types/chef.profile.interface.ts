// Time values can be:
// - "HH:MM" strings (new format, e.g., "09:00", "17:30")
// - Unix timestamps (legacy format, e.g., 946767600)
// - Empty string or 0 for "not available"
type TimeValue = string | number;

export default interface ChefProfileInterface {
  id?: number;
  user_id?: number;
  bio?: string;
  monday_start?: TimeValue;
  monday_end?: TimeValue;
  tuesday_start?: TimeValue;
  tuesday_end?: TimeValue;
  wednesday_start?: TimeValue;
  wednesday_end?: TimeValue;
  thursday_start?: TimeValue;
  thursday_end?: TimeValue;
  friday_start?: TimeValue;
  friday_end?: TimeValue;
  saterday_start?: TimeValue;
  saterday_end?: TimeValue;
  sunday_start?: TimeValue;
  sunday_end?: TimeValue;
  minimum_order_amount?: number;
  max_order_distance?: number;
  created_at?: number;
  updated_at?: number;
}
