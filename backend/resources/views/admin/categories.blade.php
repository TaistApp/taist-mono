@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Categories</div>
      <div class="div_table">
         <div class="flex flex_acenter mb10">
            <div class="fsize18 font_bold">Change Selected Categories Status:</div>
            <button class="bt_status color color1" data-status="1">Requested</button>
            <button class="bt_status color color3" data-status="2">Approved</button>
            <button class="bt_status color color2" data-status="3">Rejected</button>
         </div>
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Category ID</th>
                  <th>Category</th>
                  <th>Chef email</th>
                  <th>Menu Item ID</th>
                  <th>Status</th>
                  <th>Created at</th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($categories as $a) { ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'CAT'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a->name;?></td>
                     <td><?php echo $a->user_email;?></td>
                     <td><?php echo 'MI'.sprintf('%07d', $a->menu_id);?></td>
                     <td>
                        <?php echo ($a->status==1?'Requested':($a->status==2?'Approved':'Rejected'));?>
                     </td>
                     <td><?php echo $a->created_at;?></td>
                  </tr>
               <?php } ?>
            </tbody>
         </table>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="/assets/admin/index.js?r={{ time() }}"></script>
   <script src="/assets/admin/categories.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_categories').addClass('sel');
      $('.sub_chefs').toggleClass('sub_menu1');
      $('.toggle-arrow').toggleClass('open');
   </script>
@endsection