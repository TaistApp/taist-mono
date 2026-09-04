<?php

namespace Tests\Unit\Commands;

use App\Console\Commands\GeocodeHealthCheck;
use Tests\TestCase;

/**
 * Coverage for the geocoding canary's failure classification.
 *
 * The point of the command is that it must NOT report healthy when geocoding
 * is broken in any of the ways it has actually broken in production: a
 * rejected key (June 2026 outage), an exhausted quota (possible since the
 * 1,000/day cap was added Sept 2026), or a plausible-but-wrong coordinate
 * (the Chicago-fallback bug class).
 */
class GeocodeHealthCheckTest extends TestCase
{
    private function evaluate(array $payload, string $zip = '46038')
    {
        return (new GeocodeHealthCheck())->evaluate($payload, $zip);
    }

    /** Control case: a correct Fishers, IN answer must pass. */
    public function test_healthy_response_passes(): void
    {
        $result = $this->evaluate([
            'status' => 'OK',
            'results' => [['geometry' => ['location' => ['lat' => 39.9568, 'lng' => -86.0122]]]],
        ]);

        $this->assertTrue($result['ok']);
        $this->assertSame('OK', $result['status']);
        $this->assertLessThan(1, $result['drift'], 'exact coordinates should show ~zero drift');
    }

    /** A nearby-but-not-exact answer is still correct; the check must not be brittle. */
    public function test_nearby_coordinates_still_pass(): void
    {
        // Indianapolis, ~15 miles from Fishers — inside the 30-mile tolerance.
        $result = $this->evaluate([
            'status' => 'OK',
            'results' => [['geometry' => ['location' => ['lat' => 39.7684, 'lng' => -86.1581]]]],
        ]);

        $this->assertTrue($result['ok'], 'a point within tolerance must not raise a false alarm');
    }

    /** The original bug: geocoding "succeeds" but returns the wrong city. */
    public function test_chicago_fallback_coordinates_are_flagged(): void
    {
        $result = $this->evaluate([
            'status' => 'OK',
            'results' => [['geometry' => ['location' => ['lat' => 41.8781, 'lng' => -87.6298]]]],
        ]);

        $this->assertFalse($result['ok'], 'Chicago coords for a 46038 probe must fail the check');
        $this->assertSame('WRONG_LOCATION', $result['status']);
    }

    /** A dead or unbilled key. The alert must name billing and the key, not just echo the code. */
    public function test_request_denied_is_flagged_with_actionable_cause(): void
    {
        $result = $this->evaluate([
            'status' => 'REQUEST_DENIED',
            'error_message' => 'The provided API key is invalid.',
        ]);

        $this->assertFalse($result['ok']);
        $this->assertSame('REQUEST_DENIED', $result['status']);
        $this->assertStringContainsString('billing', $result['reason']);
        $this->assertStringContainsString('The provided API key is invalid.', $result['reason']);
    }

    /** The failure mode newly introduced by the 1,000/day quota cap. */
    public function test_over_query_limit_points_at_the_quota(): void
    {
        $result = $this->evaluate(['status' => 'OVER_QUERY_LIMIT']);

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('1,000', $result['reason']);
    }

    /** Google says OK but ships no coordinates — must not be read as healthy. */
    public function test_ok_status_without_coordinates_is_flagged(): void
    {
        $result = $this->evaluate(['status' => 'OK', 'results' => []]);

        $this->assertFalse($result['ok']);
        $this->assertSame('NO_LOCATION', $result['status']);
    }

    /** Garbage in (empty/blocked response) must not read as healthy either. */
    public function test_malformed_response_is_flagged(): void
    {
        $result = $this->evaluate([]);

        $this->assertFalse($result['ok']);
        $this->assertSame('MALFORMED_RESPONSE', $result['status']);
    }

    /** A --zip with no reference point can't drift-check, but must still catch hard failures. */
    public function test_unknown_zip_passes_on_any_valid_coordinates(): void
    {
        $result = $this->evaluate([
            'status' => 'OK',
            'results' => [['geometry' => ['location' => ['lat' => 32.7767, 'lng' => -96.7970]]]],
        ], '75201');

        $this->assertTrue($result['ok']);
    }
}
