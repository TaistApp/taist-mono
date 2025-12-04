@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="flex flex_acenter mb24">
         <div class="fsize24 font_bold">Chefs</div>
         <div class="bt_export_csv">Export to Excel <i class="fa fa-external-link"></i></div>
      </div>
      <div class="flex flex_end mb10">
         <!--<a class="bt bt_new" style="margin:0" href="/admin/chef">+ Add</a>-->
      </div>
      <div class="div_table">
         <div class="flex flex_acenter mb10">
            <div class="fsize18 font_bold">Change Selected Chefs Status:</div>
            <button class="bt_status color color1" data-status="0">Pending</button>
            <button class="bt_status color color3" data-status="1">Active</button>
            <button class="bt_status color color4" data-status="2">Rejected</button>
            <!--<button class="bt_status color color2" data-status="3">Banned</button>-->
            <button class="bt_status color color2" data-status="4">Deleted</button>
            <button class="bt_status color color2" data-action="delete_stripe">Delete Stripe Account</button>
         </div>
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Chef ID</th>
                  <th>Email</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Status</th>
                  <th>Photo</th>
                  <th>Phone</th>
                  <th>Birthday</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Created at</th>
                  <!--<th></th>-->
               </tr>
            </thead>
            <tbody>
               <?php foreach ($chefs as $a) { ?>
                  <tr id="<?php echo $a['id'];?>">
                     <td><?php echo 'CHEF'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a['email'];?></td>
                     <td><?php echo $a['first_name'];?></td>
                     <td><?php echo $a['last_name'];?></td>
                     <td>
                        <?php echo ($a['verified']==0 || $a['is_pending']==1?'Pending':($a['verified']==2?'Rejected':($a['verified']==3?'Banned':'Active')));?>
                     </td>
                     <td><?php echo isset($a['photo']) && $a['photo'] != '' ? '<img src="/assets/uploads/images/'.$a['photo'].'" width="80">' : '';?></td>
                     <td><?php echo $a['phone'];?></td>
                     <td class="date" date="<?php echo $a['birthday'];?>"></td>
                     <td><?php echo $a['address'];?></td>
                     <td><?php echo $a['city'];?></td>
                     <td><?php echo $a['state'];?></td>
                     <td><?php echo $a['zip'];?></td>
                     <td><?php echo $a['latitude'];?></td>
                     <td><?php echo $a['longitude'];?></td>
                     
                     <!--
                     <td>
                        <select id="user_status">
                           <option value="0" <?php echo $a['verified']==0?'selected':'';?>>Pending</option>
                           <option value="1" <?php echo $a['verified']==1?'selected':'';?>>Chef</option>
                           <option value="2" <?php echo $a['verified']==2?'selected':'';?>>Rejected</option>
                           <option value="3" <?php echo $a['verified']==3?'selected':'';?>>Banned</option>
                        </select>   
                     </td>
                     -->
                     
                     <td class="date" date="<?php echo $a['created_at'];?>"></td>
                     <!--<td class="tright">
                        <a class="bt_edit clrblue1 mr20" href="/admin/chef/<?php echo $a['id'];?>" style="display: inline;">Edit</a>
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
                  <th>Status</th>
                  <th>Photo</th>
                  <th>Phone</th>
                  <th>Birthday</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Created at</th>
                  <!--<th></th>-->
               </tr>
            </tfoot>
         </table>
      </div>
      {{-- Add loading overlay here --}}
      <div id="loading-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.8); z-index:9999; text-align:center; padding-top:20%;">
         <div class="loader">Processing, please wait...</div>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="/assets/admin/index.js?r={{ time() }}"></script>
   <script src="/assets/admin/chefs.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_chefs').addClass('sel');
      $('.sub_chefs').toggleClass('sub_menu1');
      $('.toggle-arrow').toggleClass('open');
   </script>
@endsection