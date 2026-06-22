<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Remediates users whose coordinates were silently stamped with the old hardcoded
 * Chicago fallback (41.8781, -87.6298) when Google geocoding failed, plus users with
 * missing coordinates. Re-geocodes from their zip; on geocode failure writes null
 * (clearing the bad fallback) so they are never matched at the wrong location.
 *
 * Run AFTER confirming GOOGLE_MAPS_API_KEY works in the target environment, otherwise
 * every re-geocode fails and rows are simply cleared to null. Safe to re-run.
 *
 *   php artisan users:fix-fallback-coordinates --dry-run
 *   php artisan users:fix-fallback-coordinates
 */
class FixFallbackCoordinates extends Command
{
    protected $signature = 'users:fix-fallback-coordinates {--dry-run : Report what would change without writing}';
    protected $description = 'Re-geocode users stranded at the Chicago fallback (41.8781,-87.6298) or missing coords';

    private const FB_LAT = 41.8781;
    private const FB_LNG = -87.6298;

    public function handle()
    {
        $dryRun = (bool) $this->option('dry-run');

        $users = DB::table('tbl_users')
            ->whereNotNull('zip')->where('zip', '!=', '')->where('zip', '!=', 'null')
            ->where(function ($q) {
                // At the Chicago fallback point (match to 4 decimals — real geocodes
                // carry many more decimals, so this isolates fallback victims)...
                $q->where(function ($q2) {
                    $q2->whereRaw('ROUND(CAST(latitude  AS DECIMAL(14,8)), 4) = ?', [self::FB_LAT])
                       ->whereRaw('ROUND(CAST(longitude AS DECIMAL(14,8)), 4) = ?', [self::FB_LNG]);
                })
                // ...or missing coordinates entirely.
                ->orWhereNull('latitude')->orWhereNull('longitude')
                ->orWhere('latitude', '')->orWhere('longitude', '')
                ->orWhere('latitude', 'null')->orWhere('longitude', 'null');
            })
            ->get(['id', 'user_type', 'email', 'zip']);

        if ($users->isEmpty()) {
            $this->info('No users need coordinate remediation.');
            return 0;
        }

        $this->info(($dryRun ? '[DRY RUN] ' : '') . "Found {$users->count()} user(s) to remediate.");

        $apiKey = env('GOOGLE_MAPS_API_KEY');
        $geocoded = 0;
        $cleared = 0;

        foreach ($users as $u) {
            $coords = $this->geocodeZipCode($u->zip, $apiKey);
            $type = $u->user_type == 2 ? 'chef' : 'cust';

            if ($coords['lat'] !== null && $coords['lng'] !== null) {
                if (!$dryRun) {
                    DB::table('tbl_users')->where('id', $u->id)
                        ->update(['latitude' => $coords['lat'], 'longitude' => $coords['lng']]);
                }
                $this->info("  [{$type} {$u->id}] {$u->email} (zip {$u->zip}) -> {$coords['lat']}, {$coords['lng']}");
                $geocoded++;
            } else {
                if (!$dryRun) {
                    DB::table('tbl_users')->where('id', $u->id)
                        ->update(['latitude' => null, 'longitude' => null]);
                }
                $this->warn("  [{$type} {$u->id}] {$u->email} (zip {$u->zip}) -> geocode FAILED, cleared to null");
                $cleared++;
            }
        }

        $this->info(($dryRun ? '[DRY RUN] ' : '') . "Done. Re-geocoded: {$geocoded}, Cleared to null: {$cleared}");

        if ($cleared > 0) {
            $this->warn("{$cleared} row(s) could not be geocoded — verify GOOGLE_MAPS_API_KEY, then re-run.");
        }

        return 0;
    }

    private function geocodeZipCode($zipCode, $apiKey)
    {
        if ($apiKey) {
            try {
                $url = 'https://maps.googleapis.com/maps/api/geocode/json?' . http_build_query([
                    'address' => $zipCode . ', USA',
                    'key' => $apiKey,
                ]);
                $data = json_decode(file_get_contents($url), true);

                if (($data['status'] ?? null) === 'OK' && !empty($data['results'])) {
                    $loc = $data['results'][0]['geometry']['location'];
                    return ['lat' => $loc['lat'], 'lng' => $loc['lng']];
                }

                Log::warning('Google Maps geocoding failed', ['zipCode' => $zipCode, 'status' => $data['status'] ?? 'unknown']);
            } catch (\Exception $e) {
                Log::error('Google Maps geocoding error', ['zipCode' => $zipCode, 'error' => $e->getMessage()]);
            }
        }

        return ['lat' => null, 'lng' => null];
    }
}
