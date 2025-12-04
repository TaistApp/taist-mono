@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="{{ url('assets/admin/index.css?r='.time()) }}">
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Contacts</div>
      <div class="div_table">
         <div class="flex flex_acenter mb10">
            <div class="fsize18 font_bold">Change Selected Tickets Status:</div>
            <button class="bt_status color color2" data-status="1">In Review</button>
            <button class="bt_status color color3" data-status="2">Resolved</button>
         </div>
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Contact ID</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Created at</th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($contacts as $a) { ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'T'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a->user_email;?></td>
                     <td><?php echo $a->subject;?></td>
                     <td><?php echo $a->message;?></td>
                     <td>
                        <?php echo ($a->status==1?'In Review':($a->status==2?'Resolved':''));?>
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
   <script src="{{ url('assets/admin/index.js?r='.time()) }}"></script>
   <script src="{{ url('assets/admin/contacts.js?r='.time()) }}"></script>
   <script>
      $('.l_menu_item_contacts').addClass('sel');
   </script>
@endsection