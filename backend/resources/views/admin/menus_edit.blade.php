@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Edit Menu Item</div>
      <div class="div_form">
         <form class="mt20" action="/admin/menus/<?php echo $menu['id']?>" method="post">
            @csrf
            <div class="row">
               <div class="col-12 col-md-8 col-md-offset-2">
                  <div class="form-group">
                     <label for="email">Menu item</label>
                     <textarea class="form-control" id="title" rows="2" name="title"><?php echo $menu['title']?></textarea>
                  </div>
                  <div class="form-group">
                     <label for="email">Description</label>
                     <textarea class="form-control" id="description" rows="5" name="description"><?php echo $menu['description']?></textarea>
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