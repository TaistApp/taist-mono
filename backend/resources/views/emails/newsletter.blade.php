@php
    $font = "font-family:'Poppins',Arial,sans-serif;";
    $para = $font . 'font-size:15px;line-height:1.65;color:#1a1a1a;';
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{{ $subject }}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');body{margin:0;padding:0;background-color:#ffffff;}</style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
@if ($preheader)
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{{ $preheader }}</div>
@endif
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="580" style="max-width:580px;width:100%;">

@if ($banner)
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
@endif

<tr><td align="center" style="padding:0 0 32px 0;"><a href="https://taist.app" target="_blank" style="text-decoration:none;"><img src="https://taist.app/images/taist-logo-only-cropped.png" alt="taist" width="160" style="display:block;width:160px;height:auto;"></a></td></tr>
<tr><td>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ebebeb;">
<tr><td style="background-color:#fa4616;height:4px;font-size:1px;line-height:1px;">&nbsp;</td></tr>
<tr><td style="padding:48px 40px 40px 40px;">

@if ($eyebrow)
<p style="margin:0 0 16px 0;{{ $font }}font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#fa4616;">{{ $eyebrow }}</p>
@endif
@if ($headline)
<h1 style="margin:0 0 20px 0;{{ $font }}font-size:28px;font-weight:700;line-height:1.25;color:#0a0a0a;">{{ $headline }}</h1>
@endif

@foreach ($intro as $paragraph)
<p style="margin:0 0 18px 0;{{ $para }}">{!! nl2br(e($paragraph)) !!}</p>
@endforeach

@if ($calloutTitle || $calloutSubtitle)
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 26px 0;border:1px solid #fa4616;border-radius:12px;"><tr><td style="padding:18px 22px;">
@if ($calloutTitle)
<p style="margin:0 0 6px 0;{{ $font }}font-size:16px;font-weight:600;color:#0a0a0a;">{{ $calloutTitle }}</p>
@endif
@if ($calloutSubtitle)
<p style="margin:0;{{ $font }}font-size:13px;line-height:1.5;color:#6b6560;">{{ $calloutSubtitle }}</p>
@endif
</td></tr></table>
@endif

@if ($itemsHeading)
<p style="margin:0 0 16px 0;{{ $font }}font-size:15px;font-weight:600;color:#0a0a0a;">{{ $itemsHeading }}</p>
@endif

@if (count($items))
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
@foreach ($items as $i => $item)
@php $last = $i === count($items) - 1; @endphp
<tr>
<td valign="top" width="40" style="padding:0 0 {{ $last ? 0 : 16 }}px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background-color:#fa4616;border-radius:14px;{{ $font }}font-size:14px;font-weight:600;color:#ffffff;line-height:28px;">{{ $i + 1 }}</td></tr></table></td>
<td valign="top" style="padding:2px 0 {{ $last ? 0 : 16 }}px 0;{{ $font }}font-size:15px;line-height:1.5;color:#1a1a1a;">@if ($item['title'])<strong style="color:#0a0a0a;">{{ $item['title'] }}</strong> @endif{{ $item['body'] }}</td>
</tr>
@endforeach
</table>
@endif

@foreach ($closing as $i => $paragraph)
<p style="margin:{{ $i === 0 ? 24 : 18 }}px 0 0 0;{{ $para }}">{!! nl2br(e($paragraph)) !!}</p>
@endforeach

@if ($signoff)
<p style="margin:18px 0 0 0;{{ $para }}">{{ $signoff }}</p>
@endif

@if ($isChef)
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:28px 0 0 0;border:1px solid #fa4616;border-radius:12px;"><tr><td align="center" style="padding:18px 22px;text-align:center;"><p style="margin:0 0 6px 0;{{ $font }}font-size:16px;font-weight:600;color:#0a0a0a;">Set your own schedule. Cook what you love. Earn what you want.</p><p style="margin:0;{{ $font }}font-size:13px;line-height:1.5;color:#6b6560;">You set your menu and prices &middot; We handle the orders</p></td></tr></table>
@endif

@if ($ctaLabel && $ctaUrl)
<hr style="border:none;border-top:1px solid #e8e8e8;margin:28px 0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;"><tr><td style="border-radius:50px;background-color:#ffffff;border:2px solid #fa4616;"><a href="{{ $ctaUrl }}" target="_blank" style="display:inline-block;padding:14px 36px;{{ $font }}font-size:14px;font-weight:600;color:#fa4616;text-decoration:none;">{{ $ctaLabel }} &rarr;</a></td></tr></table>
@if ($showPlayLink)
<p style="margin:14px 0 0 0;text-align:center;{{ $font }}font-size:12px;line-height:1.5;color:#9a9590;">On Android? <a href="{{ $playStoreUrl }}" target="_blank" style="color:#fa4616;text-decoration:none;font-weight:600;">Taist on Google Play &rarr;</a></p>
@endif
@endif

</td></tr>
</table>
</td></tr>
<tr><td style="padding:32px 0 0 0;text-align:center;">
<a href="https://taist.app" target="_blank" style="text-decoration:none;"><img src="https://taist.app/images/taist-logo-only-cropped.png" alt="taist" width="90" style="display:inline-block;width:90px;height:auto;margin-bottom:8px;"></a>
<p style="margin:0 0 4px 0;{{ $font }}font-size:13px;color:#6b6560;">On-demand personal chefs &middot; Indianapolis, IN</p>
<p style="margin:0 0 12px 0;{{ $font }}font-size:13px;color:#9a9590;">&copy; {{ date('Y') }} Taist. All rights reserved.</p>
<p style="margin:0 0 4px 0;{{ $font }}font-size:12px;line-height:1.5;color:#9a9590;">You're receiving this because you signed up for Taist{{ $isChef ? ' as a chef' : '' }}.</p>
<p style="margin:0 0 4px 0;{{ $font }}font-size:12px;line-height:1.5;color:#9a9590;">{{ $mailingAddress }}</p>
<p style="margin:0;{{ $font }}font-size:12px;line-height:1.5;"><a href="{{ $unsubscribeUrl }}" target="_blank" style="color:#9a9590;text-decoration:underline;">Unsubscribe from Taist newsletters</a></p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>
