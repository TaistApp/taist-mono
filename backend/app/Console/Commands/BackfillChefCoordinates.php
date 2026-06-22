<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BackfillChefCoordinates extends Command
{
    protected $signature = 'chefs:backfill-coordinates';
    protected $description = 'Geocode lat/lng from zip code for chefs missing coordinates';

    public function handle()
    {
        $chefs = DB::table('tbl_users')
            ->where('user_type', 2)
            ->where('is_pending', 0)
            ->where('verified', 1)
            ->where(function ($q) {
                $q->whereNull('latitude')
                    ->orWhereNull('longitude')
                    ->orWhere('latitude', '')
                    ->orWhere('longitude', '')
                    ->orWhere('latitude', 'null')
                    ->orWhere('longitude', 'null');
            })
            ->whereNotNull('zip')
            ->where('zip', '!=', '')
            ->where('zip', '!=', 'null')
            ->get(['id', 'first_name', 'last_name', 'zip']);

        if ($chefs->isEmpty()) {
            $this->info('No chefs need coordinate backfill.');
            return 0;
        }

        $this->info("Found {$chefs->count()} chef(s) needing coordinates.");

        $apiKey = env('GOOGLE_MAPS_API_KEY');
        $fixed = 0;
        $fallback = 0;

        foreach ($chefs as $chef) {
            $coords = $this->geocodeZipCode($chef->zip, $apiKey);

            DB::table('tbl_users')->where('id', $chef->id)->update([
                'latitude' => $coords['lat'],
                'longitude' => $coords['lng']
            ]);

            if ($coords['fallback']) {
                $this->warn("  [{$chef->id}] {$chef->first_name} {$chef->last_name} - fallback (zip: {$chef->zip})");
                $fallback++;
            } else {
                $this->info("  [{$chef->id}] {$chef->first_name} {$chef->last_name} - geocoded (zip: {$chef->zip})");
                $fixed++;
            }
        }

        $this->info("Done. Geocoded: {$fixed}, Fallback: {$fallback}");

        return 0;
    }

    private function geocodeZipCode($zipCode, $apiKey)
    {
        if ($apiKey) {
            try {
                $url = 'https://maps.googleapis.com/maps/api/geocode/json?' . http_build_query([
                    'address' => $zipCode . ', USA',
                    'key' => $apiKey
                ]);

                $response = file_get_contents($url);
                $data = json_decode($response, true);

                if ($data['status'] === 'OK' && !empty($data['results'])) {
                    $location = $data['results'][0]['geometry']['location'];
                    return ['lat' => $location['lat'], 'lng' => $location['lng'], 'fallback' => false];
                }

                Log::warning('Google Maps geocoding failed', ['zipCode' => $zipCode, 'status' => $data['status']]);
            } catch (\Exception $e) {
                Log::error('Google Maps geocoding error', ['zipCode' => $zipCode, 'error' => $e->getMessage()]);
            }
        }

        // Geocoding failed or no API key. Return null rather than a fake fallback
        // location (a wrong coordinate silently mis-matches the chef's service area).
        return ['lat' => null, 'lng' => null, 'fallback' => true];
    }
}
