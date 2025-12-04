@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Edit Profile</div>
      <div class="div_form">
         <form class="mt20" action="/admin/profiles/<?php echo $profile['id']?>" method="post">
            @csrf
            <div class="row">
               <div class="col-12 col-md-8 col-md-offset-2">
                  <div class="form-group">
                     <label for="bio">Bio</label>
                     <textarea class="form-control" id="bio" rows="5" name="bio"><?php echo $profile['bio']?></textarea>
                  </div>
                  <div class="form-group text-right"><button type="submit" class="btn btn-custom">Update</button></div>
               </div>
            </div>
         </form>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="/assets/admin/index.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_menus').addClass('sel');
      $('.sub_chefs').toggleClass('sub_menu1');
      $('.toggle-arrow').toggleClass('open');
   </script>
@endsection