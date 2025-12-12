@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="flex flex_acenter mb24">
         <div class="fsize24 font_bold">Pending chefs</div>
         <div class="bt_pending_export_csv">Export to Excel <i class="fa fa-external-link"></i></div>
      </div>
      <div class="flex flex_end mb10">
         <!--<a class="bt bt_new" style="margin:0" href="/admin/chef">+ Add</a>-->
      </div>
      <div class="div_table">
         <div class="flex flex_acenter mb10">
            <div class="fsize18 font_bold">Change Selected Chefs Status:</div>
            <button class="bt_status color color3" data-status="1">Activate</button>
            <button class="bt_status color color4" data-status="2">Reject</button>
            <button class="bt_status color color2" data-status="4">Delete</button>
         </div>
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Chef ID</th>
                  <th>Email</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Phone</th>
                  <th>Birthday</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip</th>
                  <th>Bio</th>
                  <th>Monday</th>
                  <th>Tuesday</th>
                  <th>Wednesday</th>
                  <th>Thursday</th>
                  <th>Friday</th>
                  <th>Saturday</th>
                  <th>Sunday</th>
                  <th>Min Order Amount</th>
                  <th>Max Order Distance</th>
                  <th>Status</th>
                  <th>Photo</th>
                  <th>Created at</th>
                  <!--<th></th>-->
               </tr>
            </thead>
            <tbody>
               <?php
               // Helper to format time value - handles both "HH:MM" strings and legacy timestamps
               $formatTime = function($val) {
                  if (empty($val) || $val === '0' || $val === 0) return '';
                  // Already "HH:MM" format
                  if (is_string($val) && preg_match('/^\d{2}:\d{2}$/', $val)) {
                     return date('H:i', strtotime($val));
                  }
                  // Legacy timestamp (9+ digits)
                  if (is_numeric($val) && strlen((string)$val) >= 9) {
                     return date('H:i', (int)$val);
                  }
                  return '';
               };
               foreach ($pendings as $a) { ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'CHEF'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a->email;?></td>
                     <td><?php echo $a->first_name;?></td>
                     <td><?php echo $a->last_name;?></td>
                     <td><?php echo $a->phone;?></td>
                     <td class="date" date="<?php echo $a->birthday;?>"></td>
                     <td><?php echo $a->address;?></td>
                     <td><?php echo $a->city;?></td>
                     <td><?php echo $a->state;?></td>
                     <td><?php echo $a->zip;?></td>
                     <td><?php echo $a->bio ?? '<em>Not provided</em>';?></td>
                     <td><?php $s=$formatTime($a->monday_start); $e=$formatTime($a->monday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->tuesday_start); $e=$formatTime($a->tuesday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->wednesday_start); $e=$formatTime($a->wednesday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->thursday_start); $e=$formatTime($a->thursday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->friday_start); $e=$formatTime($a->friday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->saterday_start); $e=$formatTime($a->saterday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->sunday_start); $e=$formatTime($a->sunday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php echo $a->minimum_order_amount ?? '<em>Not set</em>';?></td>
                     <td><?php echo $a->max_order_distance ?? '<em>Not set</em>';?></td>
                     <td>
                        <select id="user_status">
                           <option value="0" <?php echo $a->verified==0?'selected':'';?>>Pending</option>
                           <option value="1" <?php echo $a->verified==1?'selected':'';?>>Chef</option>
                           <option value="2" <?php echo $a->verified==2?'selected':'';?>>Rejected</option>
                           <option value="3" <?php echo $a->verified==3?'selected':'';?>>Banned</option>
                        </select>
                     </td>
                     <td><?php echo $a->photo;?></td>
                     <td class="date" date="<?php echo $a->created_at;?>"></td>
                     <!--<td class="tright">
                        <a class="bt_edit clrblue1 mr20" href="/admin/chef/<?php echo $a->id;?>" style="display: inline;">Edit</a>
                        <span class="bt_delete clrred">Delete</span>
                     </td>-->
                  </tr>
               <?php } ?>
            </tbody>
            <tfoot>
               <tr>
                  <th>Chef ID</th>
                  <th>Email</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Phone</th>
                  <th>Birthday</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip</th>
                  <th>Bio</th>
                  <th>Monday</th>
                  <th>Tuesday</th>
                  <th>Wednesday</th>
                  <th>Thursday</th>
                  <th>Friday</th>
                  <th>Saturday</th>
                  <th>Sunday</th>
                  <th>Min Order Amount</th>
                  <th>Max Order Distance</th>
                  <th>Status</th>
                  <th>Photo</th>
                  <th>Created at</th>
                  <!--<th></th>-->
               </tr>
            </tfoot>
         </table>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="/assets/admin/index.js?r={{ time() }}"></script>
   <script src="/assets/admin/chefs.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_pendings').addClass('sel');
   </script>
@endsection