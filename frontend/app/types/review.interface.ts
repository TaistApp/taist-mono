export default interface ReviewInterface {
  id?: number;
  order_id?: number;
  from_user_id?: number;
  to_user_id?: number;
  rating?: number;
  review?: string;
  tip_amount?: number;
  reviewer_name?: string;
  created_at?: number;
  updated_at?: number;
}
