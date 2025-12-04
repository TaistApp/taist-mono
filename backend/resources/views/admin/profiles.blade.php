@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="{{ url('assets/admin/index.css?r='.time()) }}">
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
               <?php foreach ($profiles as $a) { ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'CHEF'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a->email;?></td>
                     <td><?php echo $a->first_name;?> <?php echo $a->last_name;?></td>
                     <td><?php echo $a->bio;?></td>
                     <td><?php echo $a->monday_start?date('H:i', $a->monday_start):'';?> - <?php echo $a->monday_end?date('H:i', $a->monday_end):'';?></td>
                     <td><?php echo $a->tuesday_start?date('H:i', $a->tuesday_start):'';?> - <?php echo $a->tuesday_end?date('H:i', $a->tuesday_end):'';?></td>
                     <td><?php echo $a->wednesday_start?date('H:i', $a->wednesday_start):'';?> - <?php echo $a->wednesday_end?date('H:i', $a->wednesday_end):'';?></td>
                     <td><?php echo $a->thursday_start?date('H:i', $a->thursday_start):'';?> - <?php echo $a->thursday_end?date('H:i', $a->thursday_end):'';?></td>
                     <td><?php echo $a->friday_start?date('H:i', $a->friday_start):'';?> - <?php echo $a->friday_end?date('H:i', $a->friday_end):'';?></td>
                     <td><?php echo $a->saterday_start?date('H:i', $a->saterday_start):'';?> - <?php echo $a->saterday_end?date('H:i', $a->saterday_end):'';?></td>
                     <td><?php echo $a->sunday_start?date('H:i', $a->sunday_start):'';?> - <?php echo $a->sunday_end?date('H:i', $a->sunday_end):'';?></td>
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
   <script src="{{ url('assets/admin/index.js?r='.time()) }}"></script>
   <script src="{{ url('assets/admin/chefs.js?r='.time()) }}"></script>
   <script>
      $('.l_menu_item_profiles').addClass('sel');
      $('.sub_chefs').toggleClass('sub_menu1');
      $('.toggle-arrow').toggleClass('open');
   </script>
@endsection