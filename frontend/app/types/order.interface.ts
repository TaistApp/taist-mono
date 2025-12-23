export default interface OrderInterface {
  id?: number;
  chef_user_id?: number;
  menu_id?: number;
  customer_user_id?: number;
  amount?: number;
  total_price?: number;
  addons?: string;
  address?: string;
  order_date?: number;
  order_time?: string;
  status?: number; //1: Requested, 2:Accepted, 3:Completed, 4:Cancelled, 5:Rejected, 6:Expired
  notes?: string;
  rating?: number;
  review?: string;
  tip_amount?: number;
  created_at?: number;
  updated_at?: number;
  
  // Discount code fields
  discount_code?: string;
  discount_amount?: number;
  discount_percentage?: number;

  // TMA-020: Cancellation tracking fields
  cancelled_by_user_id?: number;
  cancelled_by_role?: 'customer' | 'chef' | 'admin' | 'system';
  cancellation_reason?: string;
  cancellation_type?: string;
  cancelled_at?: string;
  refund_amount?: number;
  refund_percentage?: number;
  refund_processed_at?: string;
  refund_stripe_id?: string;
  is_auto_closed?: boolean;
  closed_at?: string;
}
