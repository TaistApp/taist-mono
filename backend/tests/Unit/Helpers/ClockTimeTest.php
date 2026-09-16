<?php

namespace Tests\Unit\Helpers;

use App\Helpers\AppHelper;
use Tests\TestCase;

/**
 * Order times are stored 24-hour ("14:00") because that is what comparisons
 * need. A chef expiry notification shipped that raw string straight into the
 * body — "Dayne's order at 14:00" — which is not how anyone reads a time.
 */
class ClockTimeTest extends TestCase
{
    public function test_afternoon_times_read_as_a_person_would_say_them(): void
    {
        $this->assertSame('2:00pm', AppHelper::formatClockTime('14:00'));
        $this->assertSame('7:30pm', AppHelper::formatClockTime('19:30'));
        $this->assertSame('11:45pm', AppHelper::formatClockTime('23:45'));
    }

    public function test_morning_and_midnight_are_not_mangled(): void
    {
        $this->assertSame('12:00am', AppHelper::formatClockTime('00:00'));
        $this->assertSame('8:00am', AppHelper::formatClockTime('08:00'));
        $this->assertSame('12:00pm', AppHelper::formatClockTime('12:00'));
    }

    public function test_never_emits_a_24_hour_clock(): void
    {
        foreach (['13:00', '14:30', '18:15', '21:05', '23:59'] as $military) {
            $out = AppHelper::formatClockTime($military);

            $this->assertNotRegExp('/\b(1[3-9]|2[0-3]):/', $out, "leaked {$military}");
            $this->assertRegExp('/(am|pm)$/', $out, "no meridiem for {$military}");
        }
    }

    public function test_empty_input_yields_nothing_to_render(): void
    {
        $this->assertSame('', AppHelper::formatClockTime(null));
        $this->assertSame('', AppHelper::formatClockTime(''));
        $this->assertSame('', AppHelper::formatClockTime('   '));
    }

    // Control: something unparseable is passed through rather than blanked, so
    // a bad value is visible instead of silently vanishing from the copy.
    public function test_unparseable_input_is_passed_through(): void
    {
        $this->assertSame('not a time', AppHelper::formatClockTime('not a time'));
    }
}
