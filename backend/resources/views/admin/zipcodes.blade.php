@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="{{ url('assets/admin/index.css?r='.time()) }}">
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Zipcodes</div>
      <div class="div_form">
         <form class="mt20" action="/admin/zipcodes" method="post">
            @csrf
            <div class="row">
               <div class="col-12 col-md-8 col-md-offset-2">
                  <div class="form-group">
                     <label for="email">Zipcodes</label>
                     <textarea class="form-control" id="zipcodes" rows="5" name="zipcodes"><?php echo $zipcodes['zipcodes']?></textarea>
                  </div>
                  <div class="form-group text-right"><button type="submit" class="btn btn-custom">Update</button></div>
               </div>
            </div>
         </form>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="{{ url('assets/admin/index.js?r='.time()) }}"></script>
   <script>
      $('.l_menu_item_zipcodes').addClass('sel');
   </script>
@endsection