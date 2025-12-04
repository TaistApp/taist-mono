<!doctype html>
<html lang="en">
    <head>
        @include('includes.head')
    </head>
<body>
    @unless(Request::is('admin/login') || Request::is('admin'))
        @if(Auth::guard('admin')->check())
            <script>
                var token = '{{ Auth::guard("admin")->user()->api_token }}';
            </script>
            @include('includes.admin_header')
        @endif
    @endunless

    @yield('content')

    @unless(Request::is('admin/login') || Request::is('admin'))
        @include('includes.admin_footer')
    @endunless

    @yield('page-scripts')
</body>
</html>