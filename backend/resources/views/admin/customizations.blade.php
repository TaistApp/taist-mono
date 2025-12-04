@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Customizations</div>
      <div class="div_table">
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Customization ID</th>
                  <th>Menu item ID</th>
                  <th>Menu item</th>
                  <th>Customization</th>
                  <th>Price</th>
                  <th>Created at</th>
                  <th></th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($customizations as $a) { ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'CUST'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo 'MI'.sprintf('%07d', $a->menu_id);?></td>
                     <td><?php echo $a->menu_title;?></td>
                     <td><?php echo $a->name;?></td>
                     <td>$<?php echo $a->upcharge_price;?></td>
                     <td><?php echo $a->created_at;?></td>
                     <td class="tright">
                        <a class="bt_edit clrblue1 mr20" href="/admin/customizations/<?php echo $a->id;?>">Edit</a>
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
   <script src="/assets/admin/customizations.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_customizations').addClass('sel');
      $('.sub_chefs').toggleClass('sub_menu1');
      $('.toggle-arrow').toggleClass('open');
   </script>
@endsection