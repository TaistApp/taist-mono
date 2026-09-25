<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Works out which app build sent a request.
 *
 * From 32.4.8 the app sends X-App-Version / X-App-Build / X-App-Platform on
 * every call. Older iOS builds send nothing of their own, but iOS networking
 * puts the bundle's build number in the default User-Agent
 * ("Taist/70 CFNetwork/1498.700.2 Darwin/23.6.0"), so we can still place them
 * by build number. Older Android builds send "okhttp/4.x", which carries no
 * app version at all — those users only show up once they are on 32.4.8+.
 */
class AppVersion
{
    /**
     * First iOS build number of each version, oldest first. Build numbers only
     * go up, so a build belongs to the last version whose first build is <= it.
     * Taken from the git history of frontend/app.json. Only builds before
     * 32.4.8 need it (later ones send X-App-Version), so it needs no new rows.
     */
    public const IOS_FIRST_BUILD = [
        '32.0.0' => 23,
        '32.1.0' => 24,
        '32.1.1' => 25,
        '32.1.2' => 33,
        '32.2.0' => 35,
        '32.2.1' => 38,
        '32.3.0' => 40,
        '32.4.0' => 41,
        '32.4.1' => 55,
        '32.4.4' => 57,
        '32.4.5' => 60,
        '32.4.6' => 62,
        '32.4.7' => 63,
        '32.4.8' => 71,
    ];

    /**
     * @return array{platform: ?string, version: ?string, build: ?string}|null
     *         null when the request says nothing about the app build.
     */
    public static function fromRequest(Request $request): ?array
    {
        $version = self::clean($request->header('X-App-Version'));
        $build = self::clean($request->header('X-App-Build'));
        $platform = self::cleanPlatform($request->header('X-App-Platform'));

        if ($version !== null || $build !== null) {
            return ['platform' => $platform, 'version' => $version, 'build' => $build];
        }

        // Pre-32.4.8 iOS: "<BundleName>/<build> CFNetwork/..."
        $ua = (string) $request->header('User-Agent');
        if (preg_match('#^[^/\s]+/(\d{1,6}) CFNetwork/#', $ua, $m)) {
            $build = $m[1];
            return ['platform' => 'ios', 'version' => self::iosVersionForBuild((int) $build), 'build' => $build];
        }

        return null;
    }

    public static function iosVersionForBuild(int $build): ?string
    {
        $match = null;
        foreach (self::IOS_FIRST_BUILD as $version => $firstBuild) {
            if ($build >= $firstBuild) {
                $match = $version;
            }
        }
        return $match;
    }

    private static function clean($value): ?string
    {
        $value = trim((string) $value);
        if ($value === '' || strlen($value) > 20 || !preg_match('/^[0-9A-Za-z.\-]+$/', $value)) {
            return null;
        }
        return $value;
    }

    private static function cleanPlatform($value): ?string
    {
        $value = strtolower(trim((string) $value));
        return in_array($value, ['ios', 'android'], true) ? $value : null;
    }
}
