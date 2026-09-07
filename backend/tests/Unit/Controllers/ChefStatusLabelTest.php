<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\AdminApiV2Controller;
use Tests\TestCase;

/**
 * Guards the chef badge label in the admin panel.
 *
 * `verified = 0` used to be folded into the same "Pending" badge as
 * `is_pending = 1`, which hid the fact that a verified=0 account cannot log in
 * at all — MapiController@login rejects it with "You need to verify the account
 * first", and the app clears stored credentials on a failed auto-login, so the
 * chef is silently signed out with no way back in. An admin looking at the
 * panel had no way to tell that apart from a chef simply awaiting approval.
 */
class ChefStatusLabelTest extends TestCase
{
    private function label($isPaused, $isPending, $verified): string
    {
        return AdminApiV2Controller::chefStatusLabel($isPaused, $isPending, $verified);
    }

    public function test_unverified_chef_is_labelled_not_verified(): void
    {
        // The case that was previously indistinguishable from "Pending".
        $this->assertSame('Not Verified', $this->label(0, 0, 0));
    }

    public function test_unverified_wins_over_pending(): void
    {
        // Both flags set: being locked out of login is the more urgent fact.
        $this->assertSame('Not Verified', $this->label(0, 1, 0));
    }

    /** Control: an approved-but-unreviewed chef still reads "Pending". */
    public function test_pending_chef_with_verified_flag_is_still_pending(): void
    {
        $this->assertSame('Pending', $this->label(0, 1, 1));
    }

    public function test_fully_approved_chef_is_active(): void
    {
        $this->assertSame('Active', $this->label(0, 0, 1));
    }

    public function test_paused_wins_over_every_other_state(): void
    {
        $this->assertSame('Paused', $this->label(1, 1, 0));
        $this->assertSame('Paused', $this->label(1, 0, 1));
        $this->assertSame('Paused', $this->label(1, 0, 2));
    }

    public function test_rejected_and_banned_are_preserved(): void
    {
        $this->assertSame('Rejected', $this->label(0, 0, 2));
        $this->assertSame('Banned', $this->label(0, 0, 3));
    }

    /**
     * Control for the ordering above: Rejected/Banned still only surface once
     * is_pending is cleared, exactly as before this split.
     */
    public function test_pending_still_masks_rejected_and_banned(): void
    {
        $this->assertSame('Pending', $this->label(0, 1, 2));
        $this->assertSame('Pending', $this->label(0, 1, 3));
    }

    public function test_unrecognised_verified_value_falls_back_to_unknown(): void
    {
        $this->assertSame('Unknown', $this->label(0, 0, 9));
    }

    /** Values arrive from the DB as strings on some drivers — must still match. */
    public function test_string_flags_are_handled(): void
    {
        $this->assertSame('Not Verified', $this->label('0', '0', '0'));
        $this->assertSame('Active', $this->label('0', '0', '1'));
        $this->assertSame('Paused', $this->label('1', '0', '1'));
    }
}
