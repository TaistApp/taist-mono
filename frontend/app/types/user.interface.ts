export default interface UserInterface {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  birthday?: number;
  bio?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  parking_type?: string;
  parking_instructions?: string;
  // Default chef requests, pre-filled at checkout and overridable per order.
  request_shoe_coverings?: boolean | number;
  request_containers?: boolean | number;
  latitude?: number;
  longitude?: number;
  user_type?: number;
  is_pending?: number;
  is_paused?: number;
  quiz_completed?: number;
  verified?: number;
  photo?: string;
  social?: string;
  applicant_guid?: string;
  token_date?: string;
  created_at?: number;
  updated_at?: number;

  is_hot?: boolean;

  remember?: boolean;
  password?: string;
}
