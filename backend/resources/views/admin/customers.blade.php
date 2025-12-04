@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="flex flex_acenter mb24">
         <div class="fsize24 font_bold">Customers</div>
         <div class="bt_export_csv">Export to Excel <i class="fa fa-external-link"></i></div>
      </div>
      <div class="flex flex_end mb10">
         <!--<a class="bt bt_new" style="margin:0" href="/admin/chef">+ Add</a>-->
      </div>
      <div class="div_table">
         <div class="flex flex_acenter mb10">
            <div class="fsize18 font_bold">Change Selected Customer Status:</div>
            <button class="bt_status color color4" data-status="2">Rejected</button>
            <button class="bt_status color color2" data-status="4">Deleted</button>
         </div>
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Customer ID</th>
                  <th>Email</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Phone</th>
                  <th>Birthday</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip</th>
                  <th>Status</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Created at</th>
                  <!--<th></th>-->
               </tr>
            </thead>
            <tbody>
               <?php foreach ($customers as $a) { ?>
                  <tr id="<?php echo $a['id'];?>">
                     <td><?php echo 'C'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a['email'];?></td>
                     <td><?php echo $a['first_name'];?></td>
                     <td><?php echo $a['last_name'];?></td>
                     <td><?php echo $a['phone'];?></td>
                     <td class="date" date="<?php echo $a['birthday'];?>"></td>
                     <td><?php echo $a['address'];?></td>
                     <td><?php echo $a['city'];?></td>
                     <td><?php echo $a['state'];?></td>
                     <td><?php echo $a['zip'];?></td>
                     <td><?php echo ($a['verified']==0?'Pending':($a['verified']==2?'Rejected':($a['verified']==3?'Banned':'Active')));?></td>
                     <td><?php echo $a['latitude'];?></td>
                     <td><?php echo $a['longitude'];?></td>
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
                  <th>Customer ID</th>
                  <th>Email</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Phone</th>
                  <th>Birthday</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip</th>
                  <th>Status</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
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
   <script src="/assets/admin/customers.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_customers').addClass('sel');
   </script>
@endsection