@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="{{ url('assets/admin/index.css?r='.time()) }}">
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Transactions</div>
      <div class="div_table">
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Transaction ID</th>
                  <th>Customer</th>
                  <th>Chef</th>
                  <th>Amount</th>
                  <th>Created at</th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($chefs as $a) { ?>
                  <tr id="<?php echo $a['id'];?>">
                     <td><?php echo 'X'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a['from_user_id'];?></td>
                     <td><?php echo $a['to_user_id'];?></td>
                     <td><?php echo $a['amount'];?></td>
                     <td class="date" date="<?php echo $a['created_at'];?>"></td>
                  </tr>
               <?php } ?>
            </tbody>
         </table>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="{{ url('assets/admin/index.js?r='.time()) }}"></script>
   <script src="{{ url('assets/admin/transactions.js?r='.time()) }}"></script>
   <script>
      $('.l_menu_item_transactions').addClass('sel');
   </script>
@endsection