<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $chef->first_name }} {{ substr($chef->last_name ?? '', 0, 1) }}. on Taist</title>

    <!-- Open Graph / Social Sharing -->
    <meta property="og:type" content="profile">
    <meta property="og:title" content="{{ $chef->first_name }} {{ substr($chef->last_name ?? '', 0, 1) }}. — Chef on Taist">
    <meta property="og:description" content="{{ $ogDescription }}">
    <meta property="og:url" content="{{ url('/chef/' . $chef->id) }}">
    @if($chef->photo)
    <meta property="og:image" content="{{ $photoBaseUrl . $chef->photo }}">
    @else
    <meta property="og:image" content="{{ url('/assets/images/taist-og-default.png') }}">
    @endif
    <meta property="og:site_name" content="Taist">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ $chef->first_name }} {{ substr($chef->last_name ?? '', 0, 1) }}. — Chef on Taist">
    <meta name="twitter:description" content="{{ $ogDescription }}">
    @if($chef->photo)
    <meta name="twitter:image" content="{{ $photoBaseUrl . $chef->photo }}">
    @endif

    <style>
        :root {
            --bg: #f6f8fb;
            --card: #ffffff;
            --text: #1f2937;
            --muted: #4b5563;
            --brand: #fa4616;
            --border: #e5e7eb;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }

        .wrap {
            max-width: 480px;
            margin: 0 auto;
            padding: 24px 16px 40px;
            text-align: center;
        }

        .logo {
            font-size: 28px;
            font-weight: 800;
            color: var(--brand);
            letter-spacing: -0.5px;
            margin-bottom: 24px;
        }

        .avatar {
            width: 120px;
            height: 120px;
            border-radius: 60px;
            object-fit: cover;
            border: 3px solid var(--brand);
            margin-bottom: 16px;
        }

        .avatar-placeholder {
            width: 120px;
            height: 120px;
            border-radius: 60px;
            background: var(--brand);
            color: #fff;
            font-size: 48px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
        }

        .chef-name {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .rating {
            color: var(--muted);
            font-size: 16px;
            margin-bottom: 16px;
        }

        .rating .stars { color: #f59e0b; }

        .bio {
            color: var(--muted);
            font-size: 15px;
            margin-bottom: 24px;
            max-width: 360px;
            margin-left: auto;
            margin-right: auto;
        }

        .menu-section {
            background: var(--card);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            text-align: left;
        }

        .menu-section h3 {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
        }

        .menu-item {
            padding: 12px 0;
            border-bottom: 1px solid var(--border);
        }

        .menu-item:last-child { border-bottom: none; }

        .menu-item-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
        }

        .menu-item-name {
            font-weight: 600;
            font-size: 16px;
            flex: 1;
        }

        .menu-item-price {
            font-weight: 700;
            color: var(--brand);
            white-space: nowrap;
        }

        .menu-item-desc {
            color: var(--muted);
            font-size: 14px;
            margin-top: 4px;
        }

        .cta-section {
            margin-top: 8px;
        }

        .cta-btn {
            display: inline-block;
            background: var(--brand);
            color: #fff;
            font-size: 18px;
            font-weight: 700;
            padding: 16px 40px;
            border-radius: 12px;
            text-decoration: none;
            margin-bottom: 16px;
            transition: transform 0.1s;
        }

        .cta-btn:active { transform: scale(0.97); }

        .store-links {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-top: 12px;
        }

        .store-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            border-radius: 10px;
            background: var(--text);
            color: #fff;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
        }

        .store-link:hover { opacity: 0.9; }

        .footer {
            color: var(--muted);
            font-size: 13px;
            margin-top: 24px;
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="logo">Taist</div>

        @if($chef->photo)
            <img class="avatar" src="{{ $photoBaseUrl . $chef->photo }}" alt="{{ $chef->first_name }}">
        @else
            <div class="avatar-placeholder">{{ substr($chef->first_name, 0, 1) }}</div>
        @endif

        <h1 class="chef-name">{{ $chef->first_name }} {{ substr($chef->last_name ?? '', 0, 1) }}.</h1>

        @if($reviewCount > 0)
            <div class="rating">
                <span class="stars">@for($i = 0; $i < round($avgRating); $i++)&#9733;@endfor</span>
                {{ number_format($avgRating, 1) }} ({{ $reviewCount }} {{ $reviewCount === 1 ? 'review' : 'reviews' }})
            </div>
        @endif

        @if($bio)
            <p class="bio">{{ $bio }}</p>
        @endif

        @if(count($menus) > 0)
            <div class="menu-section">
                <h3>Menu</h3>
                @foreach($menus as $menu)
                    <div class="menu-item">
                        <div class="menu-item-row">
                            <span class="menu-item-name">{{ $menu->name }}</span>
                            <span class="menu-item-price">${{ number_format($menu->price, 2) }}</span>
                        </div>
                        @if($menu->description)
                            <div class="menu-item-desc">{{ \Illuminate\Support\Str::limit($menu->description, 100) }}</div>
                        @endif
                    </div>
                @endforeach
            </div>
        @endif

        <div class="cta-section">
            <a class="cta-btn" id="openApp" href="taistexpo://chef/{{ $chef->id }}">
                Open in Taist
            </a>

            <div class="store-links">
                <a class="store-link" href="https://apps.apple.com/app/taist/id6476880498">
                    &#63743; App Store
                </a>
                <a class="store-link" href="https://play.google.com/store/apps/details?id=com.taist.app">
                    &#9654; Google Play
                </a>
            </div>
        </div>

        <p class="footer">Homemade food from local chefs, delivered to your door.</p>
    </div>

    <script>
        // Try to open the app automatically on mobile
        (function() {
            var ua = navigator.userAgent || '';
            var isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
            if (!isMobile) return;

            var deepLink = 'taistexpo://chef/{{ $chef->id }}';
            var appStoreUrl = /iPhone|iPad|iPod/i.test(ua)
                ? 'https://apps.apple.com/app/taist/id6476880498'
                : 'https://play.google.com/store/apps/details?id=com.taist.app';

            // Try opening the app, fall back to store after timeout
            var start = Date.now();
            window.location.href = deepLink;

            setTimeout(function() {
                if (Date.now() - start < 2000) {
                    window.location.href = appStoreUrl;
                }
            }, 1500);
        })();
    </script>
</body>
</html>
