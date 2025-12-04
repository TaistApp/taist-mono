@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
   <link rel="stylesheet" href="/assets/admin/orders-cancellation.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Orders</div>
      <div class="div_table">
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Chef</th>
                  <th>Menu Item</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Order Date</th>
                  <th>Status</th>
                  <th>Cancellation Details</th>
                  <th>Refund Info</th>
                  <th>Review</th>
                  <th>Created</th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($orders as $a) { 
                  $isCancelled = in_array($a->status, [4, 5, 6]);
               ?>
                  <tr id="<?php echo $a->id;?>" class="<?php echo $isCancelled ? 'order-cancelled' : ''; ?>">
                     <td><strong><?php echo 'ORDER'.sprintf('%07d', $a->id);?></strong></td>
                     
                     <td>
                        <div class="user-info">
                           <div><strong><?php echo $a->customer_first_name;?> <?php echo $a->customer_last_name;?></strong></div>
                           <div class="text-muted small"><?php echo $a->customer_user_email;?></div>
                        </div>
                     </td>
                     
                     <td>
                        <div class="user-info">
                           <div><strong><?php echo $a->chef_first_name;?> <?php echo $a->chef_last_name;?></strong></div>
                           <div class="text-muted small"><?php echo $a->chef_user_email;?></div>
                        </div>
                     </td>
                     
                     <td><?php echo $a->menu_title;?></td>
                     <td><?php echo $a->amount;?></td>
                     <td><strong>$<?php echo number_format($a->total_price, 2);?></strong></td>
                     <td><?php echo date('Y-m-d H:i', ((int)$a->order_date));?></td>
                     
                     <td>
                        <span class="status-badge status-<?php echo $a->status;?>">
                           <?php echo $a->status_str;?>
                        </span>
                     </td>
                     
                     <!-- Cancellation Details Column -->
                     <td>
                        <?php if ($isCancelled) { ?>
                           <div class="cancellation-details">
                              
                              <?php if ($a->cancelled_by_role) { ?>
                                 <div class="cancel-info-row">
                                    <strong>Cancelled by:</strong>
                                    <span class="role-badge role-<?php echo $a->cancelled_by_role;?>">
                                       <?php 
                                          echo ucfirst($a->cancelled_by_role);
                                          if ($a->cancelled_by_first_name) {
                                             echo ' - ' . $a->cancelled_by_first_name . ' ' . $a->cancelled_by_last_name;
                                          }
                                       ?>
                                    </span>
                                 </div>
                              <?php } ?>
                              
                              <?php if ($a->cancelled_at) { ?>
                                 <div class="cancel-info-row">
                                    <strong>Cancelled on:</strong>
                                    <span><?php echo date('Y-m-d H:i:s', strtotime($a->cancelled_at));?></span>
                                 </div>
                              <?php } ?>
                              
                              <?php if ($a->cancellation_type) { ?>
                                 <div class="cancel-info-row">
                                    <strong>Type:</strong>
                                    <span class="cancel-type-badge">
                                       <?php echo ucwords(str_replace('_', ' ', $a->cancellation_type));?>
                                    </span>
                                 </div>
                              <?php } ?>
                              
                              <?php if ($a->cancellation_reason) { ?>
                                 <div class="cancel-info-row">
                                    <strong>Reason:</strong>
                                    <div class="cancel-reason-text">
                                       <?php echo htmlspecialchars($a->cancellation_reason);?>
                                    </div>
                                 </div>
                              <?php } ?>
                              
                              <?php if ($a->is_auto_closed) { ?>
                                 <div class="cancel-info-row">
                                    <span class="badge badge-info">
                                       <i class="fa fa-clock"></i> Auto-Closed
                                    </span>
                                 </div>
                              <?php } ?>
                              
                           </div>
                        <?php } else { ?>
                           <span class="text-muted">—</span>
                        <?php } ?>
                     </td>
                     
                     <!-- Refund Info Column -->
                     <td>
                        <?php if ($a->refund_amount) { ?>
                           <div class="refund-details">
                              <div class="refund-amount">
                                 <strong>$<?php echo number_format($a->refund_amount, 2);?></strong>
                                 <?php if ($a->refund_percentage) { ?>
                                    <span class="refund-percentage">(<?php echo $a->refund_percentage;?>%)</span>
                                 <?php } ?>
                              </div>
                              <?php if ($a->refund_processed_at) { ?>
                                 <div class="refund-date text-muted small">
                                    <?php echo date('Y-m-d H:i', strtotime($a->refund_processed_at));?>
                                 </div>
                              <?php } ?>
                              <?php if ($a->refund_stripe_id) { ?>
                                 <div class="refund-stripe small">
                                    <code><?php echo substr($a->refund_stripe_id, 0, 20);?>...</code>
                                 </div>
                              <?php } ?>
                           </div>
                        <?php } else if ($isCancelled) { ?>
                           <span class="text-warning">No refund</span>
                        <?php } else { ?>
                           <span class="text-muted">—</span>
                        <?php } ?>
                     </td>
                     
                     <!-- Review Column -->
                     <td>
                        <?php if ($a->rating) { ?>
                           <div class="review-info">
                              <div>⭐ <?php echo $a->rating;?>/5</div>
                              <?php if ($a->review) { ?>
                                 <div class="small text-muted"><?php echo substr($a->review, 0, 30);?>...</div>
                              <?php } ?>
                           </div>
                        <?php } else { ?>
                           <span class="text-muted">—</span>
                        <?php } ?>
                     </td>
                     
                     <td class="date" date="<?php echo $a->created_at;?>"></td>
                  </tr>
               <?php } ?>
            </tbody>
         </table>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="/assets/admin/index.js?r={{ time() }}"></script>
   <script src="/assets/admin/orders.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_orders').addClass('sel');
   </script>
@endsection