<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use Tests\TestCase;

/**
 * Regression coverage for the Chicago-fallback geocoding bug.
 *
 * Previously _geocodeZipCode() returned hardcoded Chicago coordinates
 * (41.8781, -87.6298) whenever geocoding could not run, silently stranding
 * users (e.g. a Fishers, IN customer) at the wrong location and matching them
 * to chefs ~160 miles away. It must now return null instead.
 */
class GeocodeFallbackTest extends TestCase
{
    private function invokeGeocode($zip)
    {
        $ref = new \ReflectionClass(MapiController::class);
        $controller = $ref->newInstanceWithoutConstructor();
        $method = $ref->getMethod('_geocodeZipCode');
        $method->setAccessible(true);

        return $method->invoke($controller, $zip);
    }

    public function test_geocode_returns_null_when_geocoding_unavailable(): void
    {
        // Force the "no API key" path so the result is deterministic and offline.
        putenv('GOOGLE_MAPS_API_KEY');
        unset($_ENV['GOOGLE_MAPS_API_KEY'], $_SERVER['GOOGLE_MAPS_API_KEY']);

        $coords = $this->invokeGeocode('46038'); // Fishers, IN

        $this->assertNull($coords['lat'], 'lat must be null when geocoding is unavailable');
        $this->assertNull($coords['lng'], 'lng must be null when geocoding is unavailable');

        // Explicit regression guard: never the old hardcoded Chicago fallback.
        $this->assertNotEquals(41.8781, $coords['lat']);
        $this->assertNotEquals(-87.6298, $coords['lng']);
    }

    /**
     * Control case: the method always returns the lat/lng keys regardless of
     * outcome, so callers can safely read $coords['lat'] / $coords['lng'].
     */
    public function test_geocode_result_always_has_lat_lng_keys(): void
    {
        putenv('GOOGLE_MAPS_API_KEY');
        unset($_ENV['GOOGLE_MAPS_API_KEY'], $_SERVER['GOOGLE_MAPS_API_KEY']);

        $coords = $this->invokeGeocode('46038');

        $this->assertArrayHasKey('lat', $coords);
        $this->assertArrayHasKey('lng', $coords);
    }
}
