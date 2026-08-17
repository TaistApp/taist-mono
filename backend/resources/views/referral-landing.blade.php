<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're invited to Taist</title>

    <!-- Open Graph / Social Sharing -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{ $referrerName ? $referrerName . ' invited you to Taist' : "You're invited to Taist" }}">
    <meta property="og:description" content="{{ $discountText ? 'Get ' . $discountText . ' your first order of homemade food from local chefs.' : 'Homemade food from local chefs, delivered to your door.' }}">
    {{-- People share the taist.app link (Vercel proxies /r/* here), so the
         canonical URL in the preview must be that public one, not the api host. --}}
    <meta property="og:url" content="https://taist.app/r/{{ $code }}">
    <meta property="og:image" content="https://taist.app/images/og-preview.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Taist">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ $referrerName ? $referrerName . ' invited you to Taist' : "You're invited to Taist" }}">
    <meta name="twitter:description" content="{{ $discountText ? 'Get ' . $discountText . ' your first order.' : 'Homemade food from local chefs.' }}">

    <style>
        :root {
            --bg: #f6f8fb;
            --card: #ffffff;
            --brand: #fa4616;
            --text: #1a1a1a;
            --muted: #6b7280;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.5;
            padding: 24px;
            display: flex;
            justify-content: center;
        }
        .wrap {
            width: 100%;
            max-width: 420px;
            text-align: center;
            padding-top: 32px;
        }
        .logo {
            height: 34px;
            width: auto;
            margin-bottom: 32px;
        }
        .badge {
            display: inline-block;
            background: var(--brand);
            color: #fff;
            font-weight: 700;
            font-size: 15px;
            padding: 8px 16px;
            border-radius: 999px;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
            margin-bottom: 12px;
        }
        .sub {
            color: var(--muted);
            font-size: 16px;
            margin-bottom: 32px;
        }
        .store-links {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 28px;
        }
        .store-link {
            display: block;
            background: var(--text);
            color: #fff;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            padding: 14px 20px;
            border-radius: 12px;
        }
        .footer {
            color: var(--muted);
            font-size: 13px;
            margin-top: 24px;
        }
    </style>
</head>
<body>
    <div class="wrap">
        <img class="logo" src="{{ url('/assets/images/logo-2.png') }}" alt="Taist">

        @if($discountText)
            <div class="badge">{{ $discountText }} your first order</div>
        @endif

        <h1>{{ $referrerName ? $referrerName . ' invited you to Taist' : "You're invited to Taist" }}</h1>

        <p class="sub">
            @if($chef)
                Order {{ $chef->first_name }}'s homemade food and more from local chefs, delivered to your door.
            @else
                Homemade food from local chefs, delivered to your door.
            @endif
        </p>

        <div class="store-links">
            <a class="store-link" href="https://apps.apple.com/app/id1598624809">&#63743;&nbsp;&nbsp;Download on the App Store</a>
            <a class="store-link" href="https://play.google.com/store/apps/details?id=com.taist.app">&#9654;&nbsp;&nbsp;Get it on Google Play</a>
        </div>

        <p class="footer">Sign up with the phone number that received this invite to claim your offer.</p>
    </div>
</body>
</html>
