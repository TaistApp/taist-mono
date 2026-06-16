import {IMenuCustomization} from '.';

export default interface MenuInterface {
  id?: number;
  user_id?: number;
  item_type?: 'standard' | 'meal_prep';
  title?: string;
  description?: string;
  price?: number;
  serving_size?: number;
  // Meal-prep-only fields (null/undefined for standard items)
  meals_per_package?: number | null;
  shelf_life_days?: number | null;
  storage_instructions?: string | null;
  meals?: string;
  category_ids?: string;
  allergens?: string;
  appliances?: string;
  estimated_time?: number;
  is_live?: number;
  customizations?: Array<IMenuCustomization>;
  created_at?: number;
  updated_at?: number;

  // AI-generated fields (used for UI state, not sent to backend)
  ai_generated_description?: string;
  description_edited?: boolean;
  price_string?: string;
  completion_time_id?: string;
  is_new_category?: boolean;
  new_category_name?: string;
}
