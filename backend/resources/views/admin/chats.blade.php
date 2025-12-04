@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="{{ url('assets/admin/index.css?r='.time()) }}">
	<div class="admin_wrapper">
      <div class="flex flex_acenter mb24">
         <div class="fsize24 font_bold">Chats</div>
      </div>
      <div class="flex flex_end mb10">
         <!--<a class="bt bt_new" style="margin:0" href="/admin/chef">+ Add</a>-->
      </div>
      <div class="div_table">
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Chat ID</th>
                  <th>Order ID</th>
                  <th>Recipient Name</th>
                  <th>Recipient Email</th>
                  <th>Sender Name</th>
                  <th>Sender Email</th>
                  <th>Message</th>
                  <th>Created at</th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($chats as $a) { ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'CHAT'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo 'ORDER'.sprintf('%07d', $a->order_id);?></td>
                     <td><?php echo $a->to_first_name;?> <?php echo $a->to_last_name;?></td>
                     <td><?php echo $a->to_user_email;?></td>
                     <td><?php echo $a->from_first_name;?> <?php echo $a->from_last_name;?></td>
                     <td><?php echo $a->from_user_email;?></td>
                     <td><?php echo $a->message;?></td>
                     <td class="date" date="<?php echo $a->created_at;?>"></td>
                  </tr>
               <?php } ?>
            </tbody>
         </table>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="{{ url('assets/admin/index.js?r='.time()) }}"></script>
   <script src="{{ url('assets/admin/chats.js?r='.time()) }}"></script>
   <script>
      $('.l_menu_item_chats').addClass('sel');
   </script>
@endsection