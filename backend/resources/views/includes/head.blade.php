	<meta charset="utf-8">

	<link rel="icon" type="image/png" href="/assets/images/favicon.png" />    
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
	<meta name="robots" content="NOINDEX, NOFOLLOW">
	<meta name="description" content="">
	<meta name="author" content="">
	<title>@yield('title', config('admin.title'))</title>

    <link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css" />
    <link rel="stylesheet" href="/assets/libs/css/bootstrap.css">
    <link rel="stylesheet" href="/assets/libs/css/bootstrap-switch.css">
    <link rel="stylesheet" href="/assets/libs/css/font-awesome.css">
    <link rel="stylesheet" href="/assets/libs/css/bootstrap-table.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/css/bootstrap-datepicker.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.13.18/css/bootstrap-select.min.css">
    <link href="https://cdn.jsdelivr.net/gh/gitbrent/bootstrap4-toggle@3.6.1/css/bootstrap4-toggle.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.10.22/css/jquery.dataTables.min.css">

    <link rel="stylesheet" href="/assets/css/main.css?r={{ time() }}">
    <link rel="stylesheet" href="/assets/css/index.css?r={{ time() }}">

    <script type="text/javascript">
        var serverURL = "{{ config('admin.server_url') }}";
    </script>
    <script>
        // load Branch
        (function(b,r,a,n,c,h,_,s,d,k){if(!b[n]||!b[n]._q){for(;s<_.length;)c(h,_[s++]);d=r.createElement(a);d.async=1;d.src="https://cdn.branch.io/branch-latest.min.js";k=r.getElementsByTagName(a)[0];k.parentNode.insertBefore(d,k);b[n]=h}})(window,document,"script","branch",function(b,r){b[r]=function(){b._q.push([r,arguments])}},{_q:[],_v:1},"addListener applyCode autoAppIndex banner closeBanner closeJourney creditHistory credits data deepview deepviewCta first getCode init link logout redeem referrals removeListener sendSMS setBranchViewData setIdentity track validateCode trackCommerceEvent logEvent disableTracking qrCode".split(" "), 0);
         // init Branch
        var branch_data = null;
        branch.init('key_live_hyga16JXtaX04su9zvcIdomlBzb2Hxiw', function(err, data) {
            // console.log(err, data);
            if (err) {}
            else {
                branch_data = data;
                if (branch_data) {
                    // if (branch_data.data_parsed.type == 'audio_detail')
                    //     $('.actions[id="'+branch_data.data_parsed.audio_id+'"] .act_edit').click();
                }
            }
        });
    </script>
    <script src="/assets/js/config.js?r={{ time() }}"></script>