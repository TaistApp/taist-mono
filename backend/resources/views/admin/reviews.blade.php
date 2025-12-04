@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Reviews</div>
      <div class="div_table">
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Review ID</th>
                  <th>Customer</th>
                  <th>Chef</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Tip amount</th>
                  <th>Created at</th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($reviews as $a) { ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'R'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a->from_user_email;?></td>
                     <td><?php echo $a->to_user_email;?></td>
                     <td><?php echo $a->rating;?></td>
                     <td><?php echo $a->review;?></td>
                     <td>$<?php echo $a->tip_amount;?></td>
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
   <script src="/assets/admin/reviews.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_reviews').addClass('sel');
   </script>
@endsection