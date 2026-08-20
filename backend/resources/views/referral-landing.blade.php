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
            display: block;
            height: 34px;
            width: auto;
            margin: 0 auto 32px;
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
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: var(--text);
            color: #fff;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            padding: 14px 20px;
            border-radius: 12px;
        }
        .store-icon {
            flex: 0 0 auto;
            height: 22px;
            width: auto;
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
            <a class="store-link" href="https://apps.apple.com/app/id1598624809">
                {{-- Apple logo. Inline so it renders without an extra asset request. --}}
                <svg class="store-icon" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true" focusable="false">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Download on the App Store
            </a>
            <a class="store-link" href="https://play.google.com/store/apps/details?id=com.taist.app">
                {{-- Google Play arrow, four-colour official geometry. --}}
                <svg class="store-icon" viewBox="30 336.5 117.5 129.5" aria-hidden="true" focusable="false">
                    <path fill="#3BCCFF" d="M99.1,401.1l-64.3-64.3c-2.6,0.6-4.8,2.9-4.8,7.6c0,7.5,0,107.5,0,113.8c0,4.3,1.7,7.4,4.9,7.7L99.1,401.1z"/>
                    <path fill="#48FF48" d="M99.1,401.1l20.1-20.2c0,0-74.6-40.7-79.1-43.1c-1.7-1-3.6-1.3-5.3-1L99.1,401.1z"/>
                    <path fill="#FF3333" d="M99.1,401.1l-64.2,64.7c1.5,0.2,3.2-0.2,5.2-1.3c4.2-2.3,48.8-26.7,79.1-43.3L99.1,401.1L99.1,401.1z"/>
                    <path fill="#FFD400" d="M119.2,421.2c15.3-8.4,27-14.8,28-15.3c3.2-1.7,6.5-6.2,0-9.7c-2.1-1.1-13.4-7.3-28-15.3l-20.1,20.2L119.2,421.2z"/>
                </svg>
                Get it on Google Play
            </a>
        </div>

        <p class="footer">Sign up with the phone number that received this invite to claim your offer.</p>
    </div>
</body>
</html>
