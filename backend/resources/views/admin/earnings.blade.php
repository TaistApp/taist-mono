@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="{{ url('assets/admin/index.css?r='.time()) }}">
	<div class="admin_wrapper">
      <div class="flex flex_acenter mb24">
         <div class="fsize24 font_bold">Earnings</div>
      </div>
      <div class="flex flex_end mb10">
         <!--<a class="bt bt_new" style="margin:0" href="/admin/chef">+ Add</a>-->
      </div>
      <div class="div_table">
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Chef ID</th>
                  <th>Chef Email</th>
                  <th>Chef Name</th>
                  <th>$/Month</th>
                  <th>Orders/Month</th>
                  <th>Items/Month</th>
                  <th>$/Year</th>
                  <th>Orders/Year</th>
                  <th>Items/Year</th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($earnings as $a) { ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'CHEF'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a->email;?></td>
                     <td><?php echo $a->first_name;?> <?php echo $a->last_name;?></td>
                     <td><?php echo $a->monthly_earning;?></td>
                     <td><?php echo $a->monthly_orders;?></td>
                     <td><?php echo $a->monthly_items;?></td>
                     <td><?php echo $a->yearly_earning;?></td>
                     <td><?php echo $a->yearly_orders;?></td>
                     <td><?php echo $a->yearly_items;?></td>
                  </tr>
               <?php } ?>
            </tbody>
         </table>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="{{ url('assets/admin/index.js?r='.time()) }}"></script>
   <script src="{{ url('assets/admin/earnings.js?r='.time()) }}"></script>
   <script>
      $('.l_menu_item_earnings').addClass('sel');
      $('.sub_chefs').toggleClass('sub_menu1');
      $('.toggle-arrow').toggleClass('open');
   </script>
@endsection