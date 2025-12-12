@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="flex flex_acenter mb24">
         <div class="fsize24 font_bold">Profiles</div>
      </div>
      <div class="flex flex_end mb10">
         <!--<a class="bt bt_new" style="margin:0" href="/admin/chef">+ Add</a>-->
      </div>
      <div class="div_table">
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Chef ID</th>
                  <th>Chef email</th>
                  <th>Chef name</th>
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
                  <th>Created at</th>
                  <th></th>
               </tr>
            </thead>
            <tbody>
               <?php
               // Helper to format time value - handles both "HH:MM" strings and legacy timestamps
               $formatTime = function($val) {
                  if (empty($val) || $val === '0' || $val === 0) return '';
                  // Already "HH:MM" format
                  if (is_string($val) && preg_match('/^\d{2}:\d{2}$/', $val)) {
                     return $val;
                  }
                  // Legacy timestamp (9+ digits)
                  if (is_numeric($val) && strlen((string)$val) >= 9) {
                     return date('H:i', (int)$val);
                  }
                  return '';
               };
               foreach ($profiles as $a) { ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'CHEF'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a->email;?></td>
                     <td><?php echo $a->first_name;?> <?php echo $a->last_name;?></td>
                     <td><?php echo $a->bio;?></td>
                     <td><?php $s=$formatTime($a->monday_start); $e=$formatTime($a->monday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->tuesday_start); $e=$formatTime($a->tuesday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->wednesday_start); $e=$formatTime($a->wednesday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->thursday_start); $e=$formatTime($a->thursday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->friday_start); $e=$formatTime($a->friday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->saterday_start); $e=$formatTime($a->saterday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php $s=$formatTime($a->sunday_start); $e=$formatTime($a->sunday_end); echo $s && $e ? "{$s} - {$e}" : '';?></td>
                     <td><?php echo $a->minimum_order_amount;?></td>
                     <td><?php echo $a->max_order_distance;?></td>
                     <td><?php echo $a->created_at;?></td>
                     <td class="tright">
                        <a class="bt_edit clrblue1 mr20" href="/admin/profiles/<?php echo $a->id;?>">Edit</a>
                     </td>
                  </tr>
               <?php } ?>
            </tbody>
         </table>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="/assets/admin/index.js?r={{ time() }}"></script>
   <script src="/assets/admin/chefs.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_profiles').addClass('sel');
      $('.sub_chefs').toggleClass('sub_menu1');
      $('.toggle-arrow').toggleClass('open');
   </script>
@endsection