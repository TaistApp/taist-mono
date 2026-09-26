@php
    $font = "font-family:'Poppins',Arial,sans-serif;";
    $ig = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;";
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{{ $subject }}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');body{margin:0;padding:0;background-color:#fafafa;}</style>
</head>
<body style="margin:0;padding:0;background-color:#fafafa;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fafafa;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="480" style="max-width:480px;width:100%;">

<tr><td style="padding:0 0 24px 0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fff7e6;border:1px solid #f5c26b;border-radius:12px;">
<tr><td style="padding:16px 20px;{{ $font }}font-size:13px;line-height:1.5;color:#5c4a1f;">
<p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#3d2f0f;">{{ $banner['title'] }}</p>
@foreach ($banner['lines'] ?? [] as $line)
<p style="margin:0 0 4px 0;">{{ $line }}</p>
@endforeach
@if (!empty($banner['links']))
<p style="margin:10px 0 0 0;">
@foreach ($banner['links'] as $i => $link)
@if ($i > 0) &nbsp;&middot;&nbsp; @endif<a href="{{ $link[1] }}" target="_blank" style="color:#fa4616;font-weight:600;text-decoration:none;">{{ $link[0] }} &rarr;</a>
@endforeach
</p>
@endif
</td></tr>
</table>
</td></tr>

@foreach ($ads as $i => $ad)
<tr><td style="padding:0 0 8px 0;{{ $font }}font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#8a8580;">
Ad {{ $i + 1 }}@if ($ad['angle']) &middot; {{ $ad['angle'] }}@endif
</td></tr>
<tr><td style="padding:0 0 28px 0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:1px solid #dbdbdb;border-radius:8px;">
<tr><td style="padding:10px 12px;{{ $ig }}font-size:14px;color:#262626;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td style="width:32px;"><img src="https://taist.app/images/taist-logo-only-cropped.png" alt="" width="32" height="32" style="display:block;width:32px;height:32px;border-radius:16px;border:1px solid #efefef;object-fit:contain;background:#fff;"></td>
<td style="padding-left:10px;{{ $ig }}font-size:14px;line-height:1.2;"><strong>taist.team</strong><br><span style="font-size:12px;color:#737373;">Sponsored</span></td>
</tr></table>
</td></tr>
<tr><td>
@if ($ad['imageUrl'])
<img src="{{ $ad['imageUrl'] }}" alt="" width="478" style="display:block;width:100%;height:auto;">
@else
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="height:300px;background-color:#f1f1f1;{{ $ig }}font-size:14px;color:#b03a1a;">No image yet</td></tr></table>
@endif
</td></tr>
<tr><td style="background-color:#f5f5f5;padding:12px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>
<td style="{{ $ig }}font-size:12px;color:#737373;line-height:1.35;">{{ $ad['linkDomain'] }}<br><strong style="font-size:14px;color:#262626;">{{ $ad['headline'] }}</strong>@if ($ad['description'])<br>{{ $ad['description'] }}@endif</td>
<td align="right" style="width:110px;"><a href="{{ $ad['linkUrl'] }}" target="_blank" style="display:inline-block;padding:7px 14px;background-color:#efefef;border-radius:8px;{{ $ig }}font-size:13px;font-weight:600;color:#262626;text-decoration:none;white-space:nowrap;">{{ $ad['ctaLabel'] }}</a></td>
</tr></table>
</td></tr>
<tr><td style="padding:12px;{{ $ig }}font-size:14px;line-height:1.45;color:#262626;"><strong>taist.team</strong> {!! nl2br(e($ad['primaryText'])) !!}</td></tr>
</table>
</td></tr>
@endforeach

<tr><td align="center" style="padding:8px 0 0 0;{{ $font }}font-size:12px;color:#8a8580;">Internal preview for the Taist team. Not sent to customers.</td></tr>
</table>
</td></tr></table>
</body>
</html>
