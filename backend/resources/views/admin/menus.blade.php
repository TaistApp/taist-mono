@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Menu items</div>
      <div class="div_table">
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Menu item ID</th>
                  <th>Chef email</th>
                  <th>Chef name</th>
                  <th>Menu item</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Serving size</th>
                  <th>Category</th>
                  <th>Required Appliances</th>
                  <th>Allergens</th>
                  <th>Estimated time</th>
                  <th>Available?</th>
                  <th>Created at</th>
                  <th></th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($menus as $a) { ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'MI'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a->user_email;?></td>
                     <td><?php echo $a->user_first_name;?> <?php echo $a->user_last_name;?></td>
                     <td><?php echo $a->title;?></td>
                     <td><?php echo $a->description;?></td>
                     <td>$<?php echo $a->price;?></td>
                     <td><?php echo $a->serving_size;?></td>
                     <td><?php echo $a->category_list->title;?></td>
                     <td><?php echo $a->appliance_list->title;?></td>
                     <td><?php echo $a->allergen_list->title;?></td>
                     <td><?php echo $a->estimated_time;?> minute(s)</td>
                     <td><?php echo $a->is_live;?></td>
                     <td><?php echo $a->created_at;?></td>
                     <td class="tright">
                        <a class="bt_edit clrblue1 mr20" href="/admin/menus/<?php echo $a->id;?>">Edit</a>
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
   <script src="/assets/admin/menus.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_menus').addClass('sel');
      $('.sub_chefs').toggleClass('sub_menu1');
      $('.toggle-arrow').toggleClass('open');
   </script>
@endsection