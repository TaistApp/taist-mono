<?php

namespace App\Http\Middleware;

use App\Support\AppVersion;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Stamps the signed-in user's row with the app build they are using, so we can
 * see who is still on an old build before raising MIN_VERSION.
 *
 * Runs after the request, and only for requests the auth:mapi guard already
 * authenticated — it never looks a user up itself. Writes only when the build
 * changed or the last stamp is over an hour old, so it is one small UPDATE per
 * user per hour, not one per API call. Never lets a failure reach the response.
 */
class RecordAppVersion
{
    private const REFRESH_SECONDS = 3600;

    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        try {
            $guard = Auth::guard('mapi');
            if (!$guard->hasUser()) {
                return $response;
            }

            $seen = AppVersion::fromRequest($request);
            if ($seen === null) {
                return $response;
            }

            $user = $guard->user();
            $unchanged = $user->app_version === $seen['version']
                && $user->app_build === $seen['build']
                && $user->app_platform === $seen['platform'];
            $fresh = $user->app_seen_at
                && strtotime($user->app_seen_at) > time() - self::REFRESH_SECONDS;

            if ($unchanged && $fresh) {
                return $response;
            }

            DB::table('tbl_users')->where('id', $user->id)->update([
                'app_version' => $seen['version'],
                'app_build' => $seen['build'],
                'app_platform' => $seen['platform'],
                'app_seen_at' => now()->toDateTimeString(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('RecordAppVersion failed: ' . $e->getMessage());
        }

        return $response;
    }
}
