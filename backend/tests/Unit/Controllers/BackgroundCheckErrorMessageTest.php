<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use Tests\TestCase;

/**
 * Regression coverage for what a chef is TOLD when SafeScreener rejects a
 * background check.
 *
 * Between 2026-08-29 and 2026-09-03 every production submission came back
 * {"code":"NOT_AUTHORIZED","message":"Not authorized. Please check your IP
 * whitelist settings and/or authentication token."} — our token/egress IP, not
 * the chef's data. The app nonetheless told each chef "There is an issue with
 * the submitted data format. Please fill the form correctly.", so two real
 * chefs from Indeed retyped the same form a dozen times and gave up while the
 * only trace was an unwatched Log::info line.
 *
 * A fieldless error is never something a chef can act on, so it must read as
 * our fault and page the team; only per-field validation errors get shown as
 * the chef's to fix.
 */
class BackgroundCheckErrorMessageTest extends TestCase
{
    public function test_not_authorized_is_owned_by_us_not_blamed_on_the_chef(): void
    {
        $described = MapiController::describeBackgroundCheckError([
            'code' => 'NOT_AUTHORIZED',
            'message' => 'Not authorized. Please check your IP whitelist settings and/or authentication token.',
        ]);

        $this->assertTrue($described['isOurFault']);
        $this->assertStringContainsString('problem on our end', $described['message']);
        $this->assertStringNotContainsString('fill the form correctly', $described['message']);
    }

    /** Control: a genuine per-field validation error IS the chef's to fix. */
    public function test_field_errors_are_shown_to_the_chef_verbatim(): void
    {
        $described = MapiController::describeBackgroundCheckError([
            'code' => 'VALIDATION_ERROR',
            'fields' => ['ssn' => ['SSN must be 9 digits.']],
        ]);

        $this->assertFalse($described['isOurFault']);
        $this->assertSame('SSN must be 9 digits.', $described['message']);
    }

    /** Several bad fields are all surfaced, not just the first. */
    public function test_multiple_field_errors_are_joined(): void
    {
        $described = MapiController::describeBackgroundCheckError([
            'code' => 'VALIDATION_ERROR',
            'fields' => [
                'ssn' => ['SSN must be 9 digits.'],
                'dateOfBirth' => ['Applicant must be 18 or older.'],
            ],
        ]);

        $this->assertFalse($described['isOurFault']);
        $this->assertStringContainsString('SSN must be 9 digits.', $described['message']);
        $this->assertStringContainsString('Applicant must be 18 or older.', $described['message']);
    }

    /** An error carrying an EMPTY fields bag is still not actionable by the chef. */
    public function test_empty_fields_bag_falls_back_to_our_fault(): void
    {
        $described = MapiController::describeBackgroundCheckError([
            'code' => 'INTERNAL_ERROR',
            'fields' => [],
        ]);

        $this->assertTrue($described['isOurFault']);
    }

    /** A dead connection decodes to nothing at all — still our problem. */
    public function test_empty_response_is_our_fault(): void
    {
        $this->assertTrue(MapiController::describeBackgroundCheckError([])['isOurFault']);
        $this->assertTrue(MapiController::describeBackgroundCheckError(null)['isOurFault']);
    }

    /** json_decode hands back stdClass, not an array — it must still classify. */
    public function test_accepts_a_decoded_object(): void
    {
        $described = MapiController::describeBackgroundCheckError(
            json_decode('{"code":"NOT_AUTHORIZED","message":"Not authorized."}')
        );

        $this->assertTrue($described['isOurFault']);
    }
}
