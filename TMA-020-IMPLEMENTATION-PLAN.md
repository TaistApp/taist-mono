# TMA-020: Enhanced Order Cancellation Tracking - Implementation Plan

**Date**: December 2, 2025  
**Status**: Planning Phase  
**Complexity**: 🟡 Moderate

---

## 📋 Executive Summary

Currently, the admin panel only shows if an order was "Cancelled" or "Rejected" with no additional context. Admins cannot see:
- **WHO** cancelled the order (customer, chef, admin, or system)
- **WHY** it was cancelled (reason/notes)
- **WHEN** it was specifically cancelled (vs general updated_at)
- **WHAT** refund was processed (amount, type, timestamp)

This plan provides a comprehensive solution to track complete cancellation metadata and display it beautifully in the admin panel.

---

## 🔍 Current State Analysis

### Existing Order Statuses
From `backend/database/taist-schema.sql` and code:

| Status Code | Status Name | Description |
|-------------|-------------|-------------|
| 1 | Requested | Customer placed order, waiting for chef |
| 2 | Accepted | Chef accepted the order |
| 3 | Completed | Order fulfilled successfully |
| 4 | Cancelled | Order cancelled by customer or chef |
| 5 | Rejected | Chef rejected the order |
| 6 | Expired | Order expired (not accepted in time) |
| 7 | On My Way | Chef is en route to deliver |

### Current Database Schema Issues

**`tbl_orders` table currently has:**
```sql
CREATE TABLE `tbl_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chef_user_id` int NOT NULL,
  `menu_id` int NOT NULL,
  `customer_user_id` int NOT NULL,
  `amount` int NOT NULL,
  `total_price` double NOT NULL,
  `addons` varchar(50) DEFAULT NULL,
  `address` varchar(255) NOT NULL,
  `order_date` varchar(50) NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `notes` text,
  `payment_token` varchar(50) DEFAULT NULL,
  `created_at` varchar(50) NOT NULL,
  `updated_at` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
)
```

**Missing Fields:**
- ❌ Who cancelled the order
- ❌ Why the order was cancelled
- ❌ When cancellation occurred (specific timestamp)
- ❌ Refund information
- ❌ Cancellation type indicator
- ❌ Auto-close metadata

### Current Admin Panel Display

**File:** `backend/resources/views/admin/orders.blade.php`

Currently shows only:
```php
<th>Status</th>
...
<td><?php echo $a->status_str;?></td>  // Just shows "Cancelled" or "Rejected"
```

**No additional cancellation details are displayed!**

---

## 🎯 Solution Architecture

### Phase 1: Database Schema Enhancement

#### New Fields for `tbl_orders` Table

```sql
-- Migration: Add cancellation tracking fields
ALTER TABLE `tbl_orders`
  -- Cancellation Actor Tracking
  ADD COLUMN `cancelled_by_user_id` INT NULL DEFAULT NULL 
    COMMENT 'User ID who initiated cancellation (customer, chef, or admin)',
  ADD COLUMN `cancelled_by_role` ENUM('customer', 'chef', 'admin', 'system') NULL DEFAULT NULL
    COMMENT 'Role of the person/entity who cancelled',
  
  -- Cancellation Reason & Timestamp
  ADD COLUMN `cancellation_reason` TEXT NULL DEFAULT NULL
    COMMENT 'Reason provided for cancellation',
  ADD COLUMN `cancelled_at` TIMESTAMP NULL DEFAULT NULL
    COMMENT 'Exact timestamp when cancellation occurred',
  
  -- Cancellation Type
  ADD COLUMN `cancellation_type` ENUM(
    'customer_request',      -- Customer manually cancelled
    'chef_request',          -- Chef manually cancelled
    'chef_rejection',        -- Chef rejected order (status 5)
    'admin_action',          -- Admin cancelled via panel
    'system_timeout',        -- Auto-cancelled due to timeout
    'system_expired',        -- Expired due to no chef acceptance
    'payment_failed',        -- Payment/refund issue
    'other'                  -- Other reasons
  ) NULL DEFAULT NULL,
  
  -- Refund Tracking
  ADD COLUMN `refund_amount` DECIMAL(10, 2) NULL DEFAULT NULL
    COMMENT 'Amount refunded to customer',
  ADD COLUMN `refund_percentage` TINYINT NULL DEFAULT NULL
    COMMENT 'Percentage of refund (80%, 100%)',
  ADD COLUMN `refund_processed_at` TIMESTAMP NULL DEFAULT NULL
    COMMENT 'When refund was processed',
  ADD COLUMN `refund_stripe_id` VARCHAR(100) NULL DEFAULT NULL
    COMMENT 'Stripe refund transaction ID',
  
  -- Additional Metadata
  ADD COLUMN `is_auto_closed` BOOLEAN DEFAULT FALSE
    COMMENT 'Whether order was auto-closed by system',
  ADD COLUMN `closed_at` TIMESTAMP NULL DEFAULT NULL
    COMMENT 'When order was marked as closed/finalized',
  
  -- Indexes for performance
  ADD INDEX idx_cancelled_by (`cancelled_by_user_id`),
  ADD INDEX idx_cancellation_type (`cancellation_type`),
  ADD INDEX idx_status_cancelled (`status`, `cancelled_at`);
```

### Phase 2: Backend API Updates

#### Update Cancellation Endpoints

**File:** `backend/app/Http/Controllers/MapiController.php`

##### 1. Update `cancelOrderPayment()` Method

```php
public function cancelOrderPayment(Request $request)
{
    if ($this->_checktaistApiKey($request->header('apiKey')) === false)
        return response()->json(['success' => 0, 'error' => "Access denied."]);
    else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
        return response()->json(['success' => 0, 'error' => "Token has been expired."]);

    $data = request()->input();
    $user = $this->_authUser();
    
    // Validate reason if provided
    $cancellationReason = $request->input('cancellation_reason', 'No reason provided');

    $errorMsg = "";
    $refundAmount = 0;
    $refundPercentage = 0;
    
    try {
        include $_SERVER['DOCUMENT_ROOT'] . '/include/config.php';
        require_once('../stripe-php/init.php');
        $stripe = new \Stripe\StripeClient($stripe_key);

        $order = app(Orders::class)->where('id', $request->order_id)->first();
        
        if (!$order) {
            return response()->json(['success' => 0, 'error' => 'Order not found']);
        }
        
        $now = now();
        $orderTime = date('Y-m-d H:i:s', $order->order_date);
        $diff = $now->diff($orderTime);

        // Calculate refund based on timing
        if ($diff->days > 1) {
            // 100% refund for orders older than 1 day
            $refundAmount = $order->total_price;
            $refundPercentage = 100;
            $stripe->refunds->create([
                'payment_intent' => $order->payment_token, 
                'amount' => $order->total_price * 100
            ]);
        } else {
            // 80% refund (20% cancellation fee)
            $refundAmount = $order->total_price * 0.8;
            $refundPercentage = 80;
            $stripe->refunds->create([
                'payment_intent' => $order->payment_token, 
                'amount' => $order->total_price * 80
            ]);
        }
        
        // Determine who is cancelling
        $cancelledByRole = null;
        $cancellationType = null;
        
        if ($user->user_type == 1) {
            // Customer cancelling
            $cancelledByRole = 'customer';
            $cancellationType = 'customer_request';
        } else if ($user->user_type == 2) {
            // Chef cancelling
            $cancelledByRole = 'chef';
            $cancellationType = 'chef_request';
        }
        
        // Update order with cancellation metadata
        $order->update([
            'status' => 4, // Cancelled
            'cancelled_by_user_id' => $user->id,
            'cancelled_by_role' => $cancelledByRole,
            'cancellation_reason' => $cancellationReason,
            'cancellation_type' => $cancellationType,
            'cancelled_at' => now(),
            'refund_amount' => $refundAmount,
            'refund_percentage' => $refundPercentage,
            'refund_processed_at' => now(),
            'updated_at' => now(),
        ]);
        
        return response()->json([
            'success' => 1, 
            'data' => $order,
            'refund_info' => [
                'amount' => $refundAmount,
                'percentage' => $refundPercentage
            ]
        ]);
        
    } catch (\Stripe\Exception\CardException $e) {
        $errorMsg = $e->getError()->message;
    } catch (\Stripe\Exception\RateLimitException $e) {
        $errorMsg = $e->getError()->message;
    } catch (Exception $e) {
        $errorMsg = "Unknown error : " . $e->getMessage();
    }
    
    if ($errorMsg != "") {
        return response()->json(['success' => 0, 'error' => $errorMsg]);
    }
}
```

##### 2. Update `updateOrderStatus()` Method

```php
public function updateOrderStatus(Request $request, $id = "")
{
    if ($this->_checktaistApiKey($request->header('apiKey')) === false)
        return response()->json(['success' => 0, 'error' => "Access denied."]);

    $user = $this->_authUser();
    $order = app(Orders::class)->where('id', $id)->first();
    
    if (!$order) {
        return response()->json(['success' => 0, 'error' => 'Order not found']);
    }

    $ary = [
        'updated_at' => now(),
    ];

    // If status is being changed to cancelled (4) or rejected (5)
    if ($request->status && in_array($request->status, [4, 5])) {
        // Determine cancellation metadata
        $cancelledByRole = null;
        $cancellationType = null;
        
        if ($user->user_type == 1) {
            $cancelledByRole = 'customer';
            $cancellationType = 'customer_request';
        } else if ($user->user_type == 2) {
            $cancelledByRole = 'chef';
            $cancellationType = $request->status == 5 ? 'chef_rejection' : 'chef_request';
        }
        
        $ary['cancelled_by_user_id'] = $user->id;
        $ary['cancelled_by_role'] = $cancelledByRole;
        $ary['cancellation_type'] = $cancellationType;
        $ary['cancelled_at'] = now();
        $ary['cancellation_reason'] = $request->input('cancellation_reason', 
            $request->status == 5 ? 'Chef rejected order' : 'Order cancelled'
        );
    }
    
    if ($request->status) $ary['status'] = $request->status;
    
    app(Orders::class)->where('id', $id)->update($ary);

    // ... existing notification logic ...
    
    $updatedOrder = app(Orders::class)->where(['id' => $id])->first();
    return response()->json(['success' => 1, 'data' => $updatedOrder]);
}
```

##### 3. Add System Auto-Close Functionality

```php
/**
 * Auto-close orders after a certain period
 * Should be called by scheduled job
 */
public function autoCloseCompletedOrders()
{
    $daysToAutoClose = 7; // Close orders 7 days after completion
    
    $ordersToClose = app(Orders::class)
        ->where('status', 3) // Completed status
        ->where('updated_at', '<', now()->subDays($daysToAutoClose))
        ->whereNull('closed_at')
        ->get();
    
    foreach ($ordersToClose as $order) {
        $order->update([
            'status' => 8, // New "Closed" status
            'closed_at' => now(),
            'is_auto_closed' => true,
            'cancelled_by_role' => 'system',
            'cancellation_type' => 'system_timeout',
            'cancellation_reason' => "Automatically closed {$daysToAutoClose} days after completion",
        ]);
    }
    
    return response()->json([
        'success' => 1, 
        'closed_count' => count($ordersToClose)
    ]);
}
```

##### 4. Add Admin Cancellation Endpoint

```php
/**
 * Admin-initiated order cancellation
 * File: backend/app/Http/Controllers/AdminapiController.php
 */
public function adminCancelOrder(Request $request, $id)
{
    $admin = $this->guard()->user();
    
    $order = app(Orders::class)->where('id', $id)->first();
    
    if (!$order) {
        return response()->json(['success' => 0, 'error' => 'Order not found']);
    }
    
    $validated = $request->validate([
        'cancellation_reason' => 'required|string|min:10',
        'refund_percentage' => 'required|integer|min:0|max:100',
    ]);
    
    // Process refund if needed
    $refundAmount = ($order->total_price * $validated['refund_percentage']) / 100;
    
    // Update order
    $order->update([
        'status' => 4,
        'cancelled_by_user_id' => $admin->id,
        'cancelled_by_role' => 'admin',
        'cancellation_type' => 'admin_action',
        'cancellation_reason' => $validated['cancellation_reason'],
        'cancelled_at' => now(),
        'refund_amount' => $refundAmount,
        'refund_percentage' => $validated['refund_percentage'],
        'updated_at' => now(),
    ]);
    
    return response()->json(['success' => 1, 'data' => $order]);
}
```

### Phase 3: Admin Panel UI Enhancement

#### Update Orders View

**File:** `backend/resources/views/admin/orders.blade.php`

##### Enhanced Table Headers

```php
<thead>
   <tr>
      <th>Order ID</th>
      <th>Customer Info</th>
      <th>Chef Info</th>
      <th>Menu Item</th>
      <th>Total Price</th>
      <th>Order Date</th>
      <th>Status</th>
      
      <!-- NEW: Cancellation Details Column -->
      <th>Cancellation Details</th>
      
      <!-- NEW: Refund Info Column -->
      <th>Refund Info</th>
      
      <th>Review</th>
      <th>Created at</th>
      <th>Actions</th>
   </tr>
</thead>
```

##### Enhanced Table Body

```php
<tbody>
   <?php foreach ($orders as $a) { ?>
      <tr class="<?php echo in_array($a->status, [4, 5, 6]) ? 'order-cancelled' : ''; ?>">
         <!-- Existing columns -->
         <td><?php echo 'ORDER'.sprintf('%07d', $a->id);?></td>
         <td>
            <div><strong><?php echo $a->customer_first_name;?> <?php echo $a->customer_last_name;?></strong></div>
            <div class="text-muted small"><?php echo $a->customer_user_email;?></div>
         </td>
         <td>
            <div><strong><?php echo $a->chef_first_name;?> <?php echo $a->chef_last_name;?></strong></div>
            <div class="text-muted small"><?php echo $a->chef_user_email;?></div>
         </td>
         <td><?php echo $a->menu_title;?></td>
         <td>$<?php echo number_format($a->total_price, 2);?></td>
         <td><?php echo date('Y-m-d H:i', ((int)$a->order_date));?></td>
         
         <!-- Status with visual indicator -->
         <td>
            <span class="status-badge status-<?php echo $a->status;?>">
               <?php echo $a->status_str;?>
            </span>
         </td>
         
         <!-- NEW: Cancellation Details -->
         <td>
            <?php if (in_array($a->status, [4, 5, 6])) { ?>
               <div class="cancellation-details">
                  
                  <!-- WHO Cancelled -->
                  <?php if ($a->cancelled_by_role) { ?>
                     <div class="cancel-info-row">
                        <strong>Cancelled by:</strong>
                        <span class="role-badge role-<?php echo $a->cancelled_by_role;?>">
                           <?php 
                              echo ucfirst($a->cancelled_by_role);
                              if ($a->cancelled_by_user_id) {
                                 $cancelledBy = DB::table('tbl_users')
                                    ->where('id', $a->cancelled_by_user_id)
                                    ->first();
                                 if ($cancelledBy) {
                                    echo ' - ' . $cancelledBy->first_name . ' ' . $cancelledBy->last_name;
                                 }
                              }
                           ?>
                        </span>
                     </div>
                  <?php } ?>
                  
                  <!-- WHEN Cancelled -->
                  <?php if ($a->cancelled_at) { ?>
                     <div class="cancel-info-row">
                        <strong>Cancelled on:</strong>
                        <span><?php echo date('Y-m-d H:i:s', strtotime($a->cancelled_at));?></span>
                     </div>
                  <?php } ?>
                  
                  <!-- WHY Cancelled (Type) -->
                  <?php if ($a->cancellation_type) { ?>
                     <div class="cancel-info-row">
                        <strong>Type:</strong>
                        <span class="cancel-type-badge type-<?php echo $a->cancellation_type;?>">
                           <?php echo ucwords(str_replace('_', ' ', $a->cancellation_type));?>
                        </span>
                     </div>
                  <?php } ?>
                  
                  <!-- WHY Cancelled (Reason) -->
                  <?php if ($a->cancellation_reason) { ?>
                     <div class="cancel-info-row">
                        <strong>Reason:</strong>
                        <div class="cancel-reason-text">
                           <?php echo htmlspecialchars($a->cancellation_reason);?>
                        </div>
                     </div>
                  <?php } ?>
                  
                  <!-- Auto-Close Indicator -->
                  <?php if ($a->is_auto_closed) { ?>
                     <div class="cancel-info-row">
                        <span class="badge badge-info">
                           <i class="fa fa-clock"></i> Auto-Closed
                        </span>
                     </div>
                  <?php } ?>
                  
               </div>
            <?php } else { ?>
               <span class="text-muted">N/A</span>
            <?php } ?>
         </td>
         
         <!-- NEW: Refund Info -->
         <td>
            <?php if ($a->refund_amount) { ?>
               <div class="refund-details">
                  <div class="refund-amount">
                     <strong>$<?php echo number_format($a->refund_amount, 2);?></strong>
                     <span class="refund-percentage">(<?php echo $a->refund_percentage;?>%)</span>
                  </div>
                  <?php if ($a->refund_processed_at) { ?>
                     <div class="refund-date text-muted small">
                        <?php echo date('Y-m-d H:i', strtotime($a->refund_processed_at));?>
                     </div>
                  <?php } ?>
                  <?php if ($a->refund_stripe_id) { ?>
                     <div class="refund-stripe small">
                        <code><?php echo $a->refund_stripe_id;?></code>
                     </div>
                  <?php } ?>
               </div>
            <?php } else if (in_array($a->status, [4, 5, 6])) { ?>
               <span class="text-warning">No refund recorded</span>
            <?php } else { ?>
               <span class="text-muted">N/A</span>
            <?php } ?>
         </td>
         
         <!-- Review -->
         <td>
            <?php if ($a->rating) { ?>
               <div>⭐ <?php echo $a->rating;?>/5</div>
               <?php if ($a->review) { ?>
                  <div class="small"><?php echo substr($a->review, 0, 50);?>...</div>
               <?php } ?>
            <?php } else { ?>
               <span class="text-muted">No review</span>
            <?php } ?>
         </td>
         
         <!-- Created At -->
         <td class="date" date="<?php echo $a->created_at;?>"></td>
         
         <!-- Actions -->
         <td>
            <a href="/admin/order/<?php echo $a->id;?>" class="btn btn-sm btn-info">View</a>
            <?php if (!in_array($a->status, [4, 5, 6]) && $a->status != 3) { ?>
               <button class="btn btn-sm btn-danger btn-cancel-order" 
                       data-order-id="<?php echo $a->id;?>">
                  Cancel
               </button>
            <?php } ?>
         </td>
      </tr>
   <?php } ?>
</tbody>
```

##### Add CSS Styling

**File:** `public/assets/admin/orders.css` (create if doesn't exist)

```css
/* Status badges */
.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-1 { background: #FFF3CD; color: #856404; } /* Requested */
.status-2 { background: #CCE5FF; color: #004085; } /* Accepted */
.status-3 { background: #D4EDDA; color: #155724; } /* Completed */
.status-4 { background: #F8D7DA; color: #721C24; } /* Cancelled */
.status-5 { background: #F5C6CB; color: #721C24; } /* Rejected */
.status-6 { background: #D6D8DB; color: #383D41; } /* Expired */
.status-7 { background: #D1ECF1; color: #0C5460; } /* On My Way */

/* Cancelled order row highlight */
.order-cancelled {
  background-color: #fff5f5 !important;
}

/* Cancellation details container */
.cancellation-details {
  max-width: 350px;
  font-size: 13px;
  line-height: 1.6;
}

.cancel-info-row {
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.cancel-info-row:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.cancel-info-row strong {
  color: #333;
  display: inline-block;
  min-width: 100px;
  font-size: 12px;
}

/* Role badges */
.role-badge {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.role-customer { background: #E3F2FD; color: #1565C0; }
.role-chef { background: #FFF3E0; color: #E65100; }
.role-admin { background: #F3E5F5; color: #6A1B9A; }
.role-system { background: #E0F2F1; color: #00695C; }

/* Cancellation type badges */
.cancel-type-badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  background: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
}

/* Cancellation reason */
.cancel-reason-text {
  margin-top: 4px;
  padding: 6px;
  background: #f8f9fa;
  border-left: 3px solid #dc3545;
  font-style: italic;
  color: #666;
  max-height: 60px;
  overflow-y: auto;
}

/* Refund details */
.refund-details {
  font-size: 13px;
}

.refund-amount {
  color: #28a745;
  font-weight: 600;
}

.refund-percentage {
  font-size: 11px;
  color: #6c757d;
  margin-left: 4px;
}

.refund-date {
  margin-top: 4px;
}

.refund-stripe code {
  font-size: 10px;
  background: #f8f9fa;
  padding: 2px 4px;
  border-radius: 3px;
}

/* Utility classes */
.text-muted { color: #6c757d; }
.text-warning { color: #ffc107; }
.small { font-size: 12px; }
```

##### Add JavaScript for Admin Cancellation Modal

**File:** `public/assets/admin/orders.js`

```javascript
$(document).ready(function() {
    // Handle admin cancel order button
    $('.btn-cancel-order').on('click', function() {
        const orderId = $(this).data('order-id');
        
        // Show modal with cancellation form
        Swal.fire({
            title: 'Cancel Order #' + orderId,
            html: `
                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 8px;">
                        <strong>Cancellation Reason:</strong>
                    </label>
                    <textarea id="cancel-reason" 
                              class="swal2-input" 
                              placeholder="Enter detailed reason for cancellation (minimum 10 characters)"
                              style="height: 100px; width: 100%;"
                    ></textarea>
                    
                    <label style="display: block; margin-top: 16px; margin-bottom: 8px;">
                        <strong>Refund Percentage:</strong>
                    </label>
                    <select id="refund-percentage" class="swal2-input">
                        <option value="100">100% - Full Refund</option>
                        <option value="80" selected>80% - Standard Cancellation</option>
                        <option value="50">50% - Partial Refund</option>
                        <option value="0">0% - No Refund</option>
                    </select>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Cancel Order',
            confirmButtonColor: '#dc3545',
            cancelButtonText: 'Abort',
            preConfirm: () => {
                const reason = $('#cancel-reason').val();
                const refundPercentage = $('#refund-percentage').val();
                
                if (!reason || reason.length < 10) {
                    Swal.showValidationMessage('Please provide a detailed reason (minimum 10 characters)');
                    return false;
                }
                
                return { reason, refundPercentage };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Send cancellation request to backend
                $.ajax({
                    url: `/adminapi/orders/${orderId}/cancel`,
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    data: {
                        cancellation_reason: result.value.reason,
                        refund_percentage: result.value.refundPercentage
                    },
                    success: function(response) {
                        if (response.success === 1) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Order Cancelled',
                                text: 'The order has been cancelled successfully.',
                                timer: 2000
                            }).then(() => {
                                location.reload();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: response.error || 'Failed to cancel order'
                            });
                        }
                    },
                    error: function() {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'An error occurred while cancelling the order'
                        });
                    }
                });
            }
        });
    });
});
```

### Phase 4: Frontend Mobile App Updates

#### Update Order Interfaces

**File:** `frontend/app/types/order.interface.ts`

```typescript
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
  status?: number;
  notes?: string;
  payment_token?: string;
  created_at?: number;
  updated_at?: number;
  
  // NEW: Cancellation tracking fields
  cancelled_by_user_id?: number;
  cancelled_by_role?: 'customer' | 'chef' | 'admin' | 'system';
  cancellation_reason?: string;
  cancellation_type?: string;
  cancelled_at?: string;
  refund_amount?: number;
  refund_percentage?: number;
  refund_processed_at?: string;
  is_auto_closed?: boolean;
  closed_at?: string;
}
```

#### Update Cancel Order API Call

**File:** `frontend/app/services/api.ts`

```typescript
export const CancelOrderPaymentAPI = async (params: {
  order_id: number;
  cancellation_reason?: string; // NEW: Optional reason
}) => {
  return await request.post('/cancelOrderPayment', params);
};
```

#### Update Customer Order Detail Screen

**File:** `frontend/app/screens/customer/orderDetail/index.tsx`

```typescript
const handleCancel = () => {
  Alert.prompt(
    'Cancel Order',
    'Please provide a reason for cancellation (optional):',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Confirm Cancellation',
        style: 'destructive',
        onPress: (reason) => handleCancelWithReason(reason || 'No reason provided'),
      },
    ],
    'plain-text',
    '',
    'default'
  );
};

const handleCancelWithReason = async (reason: string) => {
  const resp_cancel = await CancelOrderPaymentAPI({
    order_id: orderInfo?.id ?? -1,
    cancellation_reason: reason,
  });
  
  if (resp_cancel.success !== 1) {
    ShowErrorToast(resp_cancel.error || resp_cancel.message);
    return;
  }
  
  // Update status
  await handleStatus(4);
};
```

#### Update Chef Order Detail Screen

**File:** `frontend/app/screens/chef/orderDetail/index.tsx`

```typescript
// Add similar cancellation reason prompt for chefs
const handleReject = () => {
  Alert.prompt(
    'Reject Order',
    'Please provide a reason for rejection:',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Confirm Rejection',
        style: 'destructive',
        onPress: (reason) => handleRejectWithReason(reason || 'No reason provided'),
      },
    ],
    'plain-text',
    '',
    'default'
  );
};

const handleRejectWithReason = async (reason: string) => {
  const resp_reject = await RejectOrderPaymentAPI({
    order_id: orderInfo.id ?? -1,
  });
  
  if (resp_reject.success !== 1) {
    ShowErrorToast(resp_reject.error || resp_reject.message);
    return;
  }
  
  // Update status with reason
  var params = { 
    ...orderInfo, 
    status: 5,
    cancellation_reason: reason 
  };
  await UpdateOrderStatusAPI(params, dispatch);
};
```

### Phase 5: Database Migration

**File:** `backend/database/migrations/XXXX_XX_XX_add_cancellation_tracking_to_orders.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCancellationTrackingToOrders extends Migration
{
    public function up()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            // Cancellation actor tracking
            $table->unsignedInteger('cancelled_by_user_id')->nullable()->after('status');
            $table->enum('cancelled_by_role', ['customer', 'chef', 'admin', 'system'])
                  ->nullable()->after('cancelled_by_user_id');
            
            // Cancellation details
            $table->text('cancellation_reason')->nullable()->after('cancelled_by_role');
            $table->timestamp('cancelled_at')->nullable()->after('cancellation_reason');
            $table->enum('cancellation_type', [
                'customer_request',
                'chef_request',
                'chef_rejection',
                'admin_action',
                'system_timeout',
                'system_expired',
                'payment_failed',
                'other'
            ])->nullable()->after('cancelled_at');
            
            // Refund tracking
            $table->decimal('refund_amount', 10, 2)->nullable()->after('cancellation_type');
            $table->tinyInteger('refund_percentage')->nullable()->after('refund_amount');
            $table->timestamp('refund_processed_at')->nullable()->after('refund_percentage');
            $table->string('refund_stripe_id', 100)->nullable()->after('refund_processed_at');
            
            // Auto-close metadata
            $table->boolean('is_auto_closed')->default(false)->after('refund_stripe_id');
            $table->timestamp('closed_at')->nullable()->after('is_auto_closed');
            
            // Indexes
            $table->index('cancelled_by_user_id');
            $table->index('cancellation_type');
            $table->index(['status', 'cancelled_at']);
        });
    }

    public function down()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->dropIndex(['cancelled_by_user_id']);
            $table->dropIndex(['cancellation_type']);
            $table->dropIndex(['status', 'cancelled_at']);
            
            $table->dropColumn([
                'cancelled_by_user_id',
                'cancelled_by_role',
                'cancellation_reason',
                'cancelled_at',
                'cancellation_type',
                'refund_amount',
                'refund_percentage',
                'refund_processed_at',
                'refund_stripe_id',
                'is_auto_closed',
                'closed_at',
            ]);
        });
    }
}
```

### Phase 6: Update Models

**File:** `backend/app/Models/Orders.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Orders extends Model
{
    protected $table = 'tbl_orders';
    
    protected $fillable = [
        'chef_user_id',
        'menu_id',
        'customer_user_id',
        'amount',
        'total_price',
        'addons',
        'address',
        'order_date',
        'status',
        'notes',
        'payment_token',
        // NEW: Cancellation fields
        'cancelled_by_user_id',
        'cancelled_by_role',
        'cancellation_reason',
        'cancelled_at',
        'cancellation_type',
        'refund_amount',
        'refund_percentage',
        'refund_processed_at',
        'refund_stripe_id',
        'is_auto_closed',
        'closed_at',
    ];

    public function getCreatedAtAttribute($date)
    {
        return strtotime($date);
    }

    public function getUpdatedAtAttribute($date)
    {
        return strtotime($date);
    }
    
    // NEW: Relationship to get who cancelled
    public function cancelledBy()
    {
        return $this->belongsTo('App\Models\Listener', 'cancelled_by_user_id', 'id');
    }
    
    // NEW: Helper method
    public function getCancellationSummary()
    {
        if (!$this->cancelled_at) {
            return null;
        }
        
        $cancelledBy = $this->cancelledBy;
        $name = $cancelledBy 
            ? $cancelledBy->first_name . ' ' . $cancelledBy->last_name 
            : 'Unknown';
        
        return [
            'who' => $name,
            'role' => $this->cancelled_by_role,
            'when' => $this->cancelled_at,
            'reason' => $this->cancellation_reason,
            'type' => $this->cancellation_type,
        ];
    }
}
```

---

## 📊 Implementation Checklist

### Database (Priority: HIGH)
- [ ] Create migration file for new columns
- [ ] Test migration on local database
- [ ] Test rollback functionality
- [ ] Update `taist-schema.sql` with new schema
- [ ] Add indexes for performance

### Backend API (Priority: HIGH)
- [ ] Update `cancelOrderPayment()` method
- [ ] Update `updateOrderStatus()` method  
- [ ] Create `autoCloseCompletedOrders()` method
- [ ] Create `adminCancelOrder()` endpoint
- [ ] Update Orders model with fillable fields
- [ ] Add relationship methods
- [ ] Add admin API route for cancellation

### Admin Panel UI (Priority: MEDIUM)
- [ ] Update `AdminController::orders()` to include new fields
- [ ] Update `orders.blade.php` table headers
- [ ] Update `orders.blade.php` table body with cancellation details
- [ ] Create `orders.css` stylesheet
- [ ] Update `orders.js` with modal functionality
- [ ] Add SweetAlert2 library if not present
- [ ] Test responsive design

### Mobile App (Priority: LOW - Enhancement)
- [ ] Update `OrderInterface` type definition
- [ ] Update `CancelOrderPaymentAPI` signature
- [ ] Add cancellation reason prompt for customers
- [ ] Add rejection reason prompt for chefs
- [ ] Test cancellation flow on iOS
- [ ] Test cancellation flow on Android

### Testing (Priority: HIGH)
- [ ] Test customer cancellation flow
- [ ] Test chef cancellation flow
- [ ] Test chef rejection flow
- [ ] Test admin cancellation flow
- [ ] Test refund calculation logic
- [ ] Verify Stripe refund processing
- [ ] Test admin panel display for all cancellation types
- [ ] Test performance with large order datasets

### Documentation
- [ ] Update API documentation
- [ ] Create admin user guide
- [ ] Document cancellation policies
- [ ] Update database schema docs

---

## 🎨 UI/UX Mockup - Admin Panel

### Before (Current State):
```
| Status     |
|------------|
| Cancelled  |
| Rejected   |
| Completed  |
```
❌ **Problem**: No context, no details!

### After (Enhanced State):
```
| Status     | Cancellation Details                              | Refund Info        |
|------------|--------------------------------------------------|--------------------|
| Cancelled  | Cancelled by: Customer - John Smith              | $45.00 (80%)       |
|            | Cancelled on: 2025-12-02 14:30:22                | 2025-12-02 14:30   |
|            | Type: Customer Request                           |                    |
|            | Reason: "Found another chef with better price"  |                    |
|------------|--------------------------------------------------|--------------------|
| Rejected   | Cancelled by: Chef - Maria Garcia                | $56.25 (100%)      |
|            | Cancelled on: 2025-12-02 10:15:33                | 2025-12-02 10:16   |
|            | Type: Chef Rejection                             |                    |
|            | Reason: "Out of ingredients for this dish"       |                    |
|------------|--------------------------------------------------|--------------------|
| Completed  | N/A                                              | N/A                |
```
✅ **Solution**: Complete transparency!

---

## 🚀 Deployment Strategy

### Step 1: Database Migration (Downtime: ~2 minutes)
1. Backup production database
2. Run migration on staging first
3. Test thoroughly on staging
4. Schedule maintenance window
5. Run migration on production
6. Verify all columns added

### Step 2: Backend Deployment (No Downtime)
1. Deploy updated Controllers
2. Deploy updated Models
3. Deploy new routes
4. Test API endpoints

### Step 3: Admin Panel Deployment (No Downtime)
1. Deploy new views
2. Deploy CSS/JS assets
3. Clear cache
4. Test admin panel access

### Step 4: Mobile App Update (Optional - Low Priority)
1. Update interfaces
2. Update API calls
3. Test cancellation flows
4. Submit to app stores (if needed)

---

## 📈 Success Metrics

### Functional Requirements
- ✅ Admins can see WHO cancelled every order
- ✅ Admins can see WHY orders were cancelled
- ✅ Admins can see WHEN cancellations occurred
- ✅ Admins can see refund details for each order
- ✅ Admins can cancel orders with detailed reasons
- ✅ All cancellation data is tracked automatically

### Performance Requirements
- Admin panel loads in < 2 seconds with 1000+ orders
- Queries use indexed fields for fast filtering
- No impact on mobile app performance

### Data Quality Requirements
- 100% of new cancellations have complete metadata
- Historical cancelled orders show "N/A" gracefully
- No NULL errors or broken displays

---

## 🔮 Future Enhancements (Optional)

### Phase 7: Advanced Analytics
- Cancellation rate dashboard
- Most common cancellation reasons
- Chef/Customer cancellation patterns
- Financial impact reports

### Phase 8: Automated Actions
- Auto-refund based on cancellation type
- Automated follow-up emails
- Chef/Customer warnings for excessive cancellations

### Phase 9: Customer-Facing Improvements
- Show cancellation history in customer app
- Dispute resolution system
- Cancellation feedback loop

---

## ⚠️ Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database migration fails | HIGH | Test thoroughly on staging; have rollback plan ready |
| Stripe refund errors | HIGH | Add comprehensive error handling and logging |
| Admin panel performance degradation | MEDIUM | Use indexes; lazy-load cancellation details if needed |
| Missing historical data | LOW | Show "N/A" for orders before implementation |
| Mobile app breaking changes | LOW | Make all new fields optional in interface |

---

## 📝 Notes

- All timestamps use Laravel's `now()` function for consistency
- Cancellation reasons have no character limit (TEXT field)
- Refund percentages stored as integers (80, 100, etc.)
- All new fields are **nullable** to maintain backward compatibility
- Existing cancelled orders will show partial information (graceful degradation)

---

**Ready for implementation! 🎉**





