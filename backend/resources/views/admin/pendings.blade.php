@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="{{ url('assets/admin/index.css?r='.time()) }}">
	<div class="admin_wrapper">
      <div class="flex flex_acenter mb24">
         <div class="fsize24 font_bold">Pending chefs</div>
         <div class="bt_pending_export_csv">Export to Excel <i class="fa fa-external-link"></i></div>
      </div>
      <div class="flex flex_end mb10">
         <!--<a class="bt bt_new" style="margin:0" href="/admin/chef">+ Add</a>-->
      </div>
      <div class="div_table">
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
               <?php foreach ($pendings as $a) { ?>
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
                     <td><?php echo $a->monday_start?date('H:i', $a->monday_start):'';?> <?php echo ($a->monday_start && $a->monday_end)?'-':'';?> <?php echo $a->monday_end?date('H:i', $a->monday_end):'';?></td>
                     <td><?php echo $a->tuesday_start?date('H:i', $a->tuesday_start):'';?> <?php echo ($a->tuesday_start && $a->tuesday_end)?'-':'';?> <?php echo $a->tuesday_end?date('H:i', $a->tuesday_end):'';?></td>
                     <td><?php echo $a->wednesday_start?date('H:i', $a->wednesday_start):'';?> <?php echo ($a->wednesday_start && $a->wednesday_end)?'-':'';?> <?php echo $a->wednesday_end?date('H:i', $a->wednesday_end):'';?></td>
                     <td><?php echo $a->thursday_start?date('H:i', $a->thursday_start):'';?> <?php echo ($a->thursday_start && $a->thursday_end)?'-':'';?> <?php echo $a->thursday_end?date('H:i', $a->thursday_end):'';?></td>
                     <td><?php echo $a->friday_start?date('H:i', $a->friday_start):'';?> <?php echo ($a->friday_start && $a->friday_end)?'-':'';?> <?php echo $a->friday_end?date('H:i', $a->friday_end):'';?></td>
                     <td><?php echo $a->saterday_start?date('H:i', $a->saterday_start):'';?> <?php echo ($a->saterday_start && $a->saterday_end)?'-':'';?> <?php echo $a->saterday_end?date('H:i', $a->saterday_end):'';?></td>
                     <td><?php echo $a->sunday_start?date('H:i', $a->sunday_start):'';?> <?php echo ($a->sunday_start && $a->sunday_end)?'-':'';?> <?php echo $a->sunday_end?date('H:i', $a->sunday_end):'';?></td>
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
   <script src="{{ url('assets/admin/index.js?r='.time()) }}"></script>
   <script src="{{ url('assets/admin/chefs.js?r='.time()) }}"></script>
   <script>
      $('.l_menu_item_pendings').addClass('sel');
   </script>
@endsection