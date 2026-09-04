<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Daily canary for the Google Geocoding API.
 *
 * Geocoding has no user-visible failure mode of its own: when it breaks,
 * `_geocodeZipCode()` returns null and customers simply see "Location not
 * available" with nothing naming the cause. The June 2026 outage (a deleted
 * API key in an external GCP project) therefore ran unnoticed for months.
 *
 * This command geocodes a known ZIP and fails loudly when the answer is
 * missing OR wrong, so a dead key, a lapsed billing account, or a tripped
 * quota surfaces within a day instead of by accident.
 */
class GeocodeHealthCheck extends Command
{
    protected $signature = 'geocode:health
                            {--zip=46038 : ZIP code to probe}
                            {--no-email : Run the probe and report, but never send the alert email}';

    protected $description = 'Verify the Google Geocoding API still answers correctly; email on failure';

    /** Fishers, IN — the ZIP whose mis-geocoding exposed the original Chicago-fallback bug. */
    private const EXPECTED = [
        '46038' => ['lat' => 39.9568, 'lng' => -86.0122],
    ];

    /** A correct answer must land within this many miles of the expected point. */
    private const TOLERANCE_MILES = 30;

    private const ALERT_TO = 'contact@taist.app';
    private const ALERT_FROM = 'Taist Alerts <alerts@taist.app>';

    public function handle()
    {
        $zip = (string) $this->option('zip');
        $apiKey = env('GOOGLE_MAPS_API_KEY');

        if (! $apiKey) {
            return $this->fail($zip, 'NO_API_KEY', 'GOOGLE_MAPS_API_KEY is not set on this environment.');
        }

        try {
            $data = $this->fetchGeocode($zip, $apiKey);
        } catch (\Exception $e) {
            return $this->fail($zip, 'REQUEST_FAILED', 'Could not reach the Geocoding API: ' . $e->getMessage());
        }

        $result = $this->evaluate($data, $zip);

        if (! $result['ok']) {
            return $this->fail($zip, $result['status'], $result['reason']);
        }

        $this->info(sprintf(
            'OK — %s geocoded to %.4f, %.4f (%.1f mi from expected)',
            $zip,
            $result['lat'],
            $result['lng'],
            $result['drift']
        ));

        return 0;
    }

    /**
     * Decide whether a Geocoding API response is healthy.
     *
     * Split out from the HTTP call so the failure classification is unit
     * testable without touching the network.
     */
    public function evaluate($data, $zip)
    {
        $status = isset($data['status']) ? $data['status'] : 'MALFORMED_RESPONSE';
        $googleMessage = isset($data['error_message']) ? ' — ' . $data['error_message'] : '';

        if ($status !== 'OK') {
            return [
                'ok' => false,
                'status' => $status,
                'reason' => $this->explain($status) . $googleMessage,
            ];
        }

        if (empty($data['results'][0]['geometry']['location'])) {
            return [
                'ok' => false,
                'status' => 'NO_LOCATION',
                'reason' => 'Google returned OK but the response carried no coordinates.',
            ];
        }

        $lat = $data['results'][0]['geometry']['location']['lat'];
        $lng = $data['results'][0]['geometry']['location']['lng'];

        // A wrong-but-plausible coordinate is the dangerous case: it silently
        // matches customers to chefs in the wrong service area, which is
        // exactly what the Chicago fallback used to do.
        if (isset(self::EXPECTED[$zip])) {
            $drift = $this->milesBetween($lat, $lng, self::EXPECTED[$zip]['lat'], self::EXPECTED[$zip]['lng']);

            if ($drift > self::TOLERANCE_MILES) {
                return [
                    'ok' => false,
                    'status' => 'WRONG_LOCATION',
                    'reason' => sprintf(
                        'Geocoded %s to %.4f, %.4f — %.0f miles from the expected location. '
                        . 'Coordinates this far off will match users to chefs in the wrong area.',
                        $zip,
                        $lat,
                        $lng,
                        $drift
                    ),
                ];
            }

            return ['ok' => true, 'status' => 'OK', 'lat' => $lat, 'lng' => $lng, 'drift' => $drift];
        }

        // Custom ZIP via --zip: no reference point, so answering at all is the bar.
        return ['ok' => true, 'status' => 'OK', 'lat' => $lat, 'lng' => $lng, 'drift' => 0.0];
    }

    /**
     * Map a Google status onto the thing that actually needs fixing, so the
     * alert says what to go do rather than just quoting an error code.
     */
    private function explain($status)
    {
        switch ($status) {
            case 'REQUEST_DENIED':
                return 'The API key was rejected. Usual causes: the key was deleted or regenerated in GCP, '
                    . 'billing lapsed on project project-98b5e874… (contact@taist.app), or the key restriction '
                    . 'no longer covers the Geocoding API.';
            case 'OVER_QUERY_LIMIT':
                return 'Quota exceeded. The Geocoding API "v3 requests per day" quota is capped at 1,000/day — '
                    . 'raise it in the GCP console, or investigate why usage spiked.';
            case 'ZERO_RESULTS':
                return 'Google answered but found no match for this ZIP. Likely a bad --zip value rather than an outage.';
            case 'INVALID_REQUEST':
                return 'Google rejected the request as malformed — the probe itself is likely at fault.';
            case 'NO_API_KEY':
                return 'GOOGLE_MAPS_API_KEY is not set on this environment.';
            default:
                return 'Unexpected status "' . $status . '" from the Geocoding API.';
        }
    }

    /**
     * Report a failure: console, log, and (in production) an alert email.
     *
     * Returns a non-zero exit code so a manual run is scriptable.
     */
    private function fail($zip, $status, $reason)
    {
        $summary = "Geocoding health check FAILED [{$status}] for ZIP {$zip}";

        $this->error($summary);
        $this->line($reason);

        Log::error('Geocoding health check failed', [
            'zip' => $zip,
            'status' => $status,
            'reason' => $reason,
        ]);

        if ($this->option('no-email')) {
            $this->warn('Alert email suppressed (--no-email).');
            return 1;
        }

        // Mirrors the SMS gate: alerts only leave production unless explicitly
        // enabled, so staging outages don't page anyone twice.
        if (! env('GEOCODE_HEALTH_ALERTS', env('APP_ENV') === 'production')) {
            $this->warn('Alert email suppressed (not production; set GEOCODE_HEALTH_ALERTS=true to override).');
            return 1;
        }

        $this->sendAlert($zip, $status, $reason);

        return 1;
    }

    private function sendAlert($zip, $status, $reason)
    {
        $apiKey = env('RESEND_API_KEY');

        if (! $apiKey) {
            $this->error('Cannot send alert: RESEND_API_KEY is not set.');
            return;
        }

        $impact = 'While this is broken, new signups get no coordinates and chef search returns '
            . '"Location not available" instead of chefs. Existing users with stored coordinates are unaffected.';

        $text = "Geocoding health check FAILED\n\n"
            . "Status: {$status}\n"
            . "ZIP probed: {$zip}\n"
            . "Environment: " . env('APP_ENV', 'unknown') . "\n\n"
            . "{$reason}\n\n"
            . "{$impact}\n\n"
            . "Console: https://console.cloud.google.com/apis/credentials\n";

        $html = '<p><strong>Geocoding health check FAILED</strong></p>'
            . '<p><strong>Status:</strong> ' . e($status) . '<br>'
            . '<strong>ZIP probed:</strong> ' . e($zip) . '<br>'
            . '<strong>Environment:</strong> ' . e(env('APP_ENV', 'unknown')) . '</p>'
            . '<p>' . e($reason) . '</p>'
            . '<p>' . e($impact) . '</p>'
            . '<p><a href="https://console.cloud.google.com/apis/credentials">Google Cloud credentials console</a></p>';

        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->post('https://api.resend.com/emails', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $apiKey,
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'from' => self::ALERT_FROM,
                    'to' => [self::ALERT_TO],
                    'subject' => "[Taist] Geocoding is down ({$status})",
                    'html' => $html,
                    'text' => $text,
                ],
                'timeout' => 15,
            ]);

            if ($response->getStatusCode() === 200) {
                $this->info('Alert email sent to ' . self::ALERT_TO);
                return;
            }

            $this->error('Alert email failed: HTTP ' . $response->getStatusCode());
        } catch (\Exception $e) {
            Log::error('Geocoding health alert email failed: ' . $e->getMessage());
            $this->error('Alert email failed: ' . $e->getMessage());
        }
    }

    /**
     * Overridable seam so tests can exercise the classification logic offline.
     */
    protected function fetchGeocode($zip, $apiKey)
    {
        $client = new \GuzzleHttp\Client();
        $response = $client->get('https://maps.googleapis.com/maps/api/geocode/json', [
            'query' => ['address' => $zip . ', USA', 'key' => $apiKey],
            'timeout' => 15,
        ]);

        return json_decode((string) $response->getBody(), true);
    }

    /** Haversine, matching the distance math getSearchChefs already uses. */
    private function milesBetween($lat1, $lng1, $lat2, $lng2)
    {
        $earthRadius = 3959;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) * sin($dLng / 2);

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
