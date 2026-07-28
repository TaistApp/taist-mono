<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Rate-limiting tests for the unauthenticated verify_phone endpoint.
 *
 * The endpoint sends a billable SMS per call, making it a target for
 * SMS-pumping abuse. Limits: 3 sends per phone per 10 minutes,
 * 10 sends per IP per hour.
 *
 * In APP_ENV=testing the actual Twilio send is suppressed (SMS_ENABLED gate)
 * and reported as success, so these tests exercise the full endpoint without
 * sending real SMS.
 */
class VerifyPhoneRateLimitTest extends TestCase
{
    /**
     * Under the limit, sends succeed and return a code (shipped app versions
     * verify client-side against data.code, so the shape must not change).
     */
    public function test_verify_phone_succeeds_under_limit()
    {
        for ($i = 1; $i <= 3; $i++) {
            $response = $this->postJson('/mapi/verify_phone', [
                'phone_number' => '3175550188'
            ]);

            $response->assertStatus(200)->assertJsonPath('success', 1);
            $this->assertNotEmpty($response->json('data.code'), "Attempt {$i} should return a code");
        }
    }

    public function test_verify_phone_blocks_fourth_attempt_for_same_phone()
    {
        for ($i = 1; $i <= 3; $i++) {
            $this->postJson('/mapi/verify_phone', ['phone_number' => '3175550188'])
                ->assertJsonPath('success', 1);
        }

        $blocked = $this->postJson('/mapi/verify_phone', ['phone_number' => '3175550188']);

        $blocked->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertStringContainsString('Too many', $blocked->json('error'));
    }

    /**
     * Formatting variants of the same phone share one bucket — the limiter
     * key is normalized to digits.
     */
    public function test_verify_phone_limit_ignores_phone_formatting()
    {
        $this->postJson('/mapi/verify_phone', ['phone_number' => '3175550188'])
            ->assertJsonPath('success', 1);
        $this->postJson('/mapi/verify_phone', ['phone_number' => '(317) 555-0188'])
            ->assertJsonPath('success', 1);
        $this->postJson('/mapi/verify_phone', ['phone_number' => '317.555.0188'])
            ->assertJsonPath('success', 1);

        $blocked = $this->postJson('/mapi/verify_phone', ['phone_number' => '317 555 0188']);

        $blocked->assertJsonPath('success', 0);
        $this->assertStringContainsString('Too many', $blocked->json('error'));
    }

    /**
     * Control: a different phone is not affected by another phone's limit.
     */
    public function test_verify_phone_allows_different_phone_after_per_phone_block()
    {
        for ($i = 1; $i <= 4; $i++) {
            $this->postJson('/mapi/verify_phone', ['phone_number' => '3175550188']);
        }

        $this->postJson('/mapi/verify_phone', ['phone_number' => '3175550199'])
            ->assertJsonPath('success', 1);
    }

    /**
     * The per-IP limit (10/hour) blocks rotating-phone abuse from one source.
     */
    public function test_verify_phone_blocks_when_ip_limit_exceeded()
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/mapi/verify_phone', [
                'phone_number' => '317555' . str_pad((string) (100 + $i), 4, '0', STR_PAD_LEFT)
            ])->assertJsonPath('success', 1);
        }

        $blocked = $this->postJson('/mapi/verify_phone', ['phone_number' => '3175559999']);

        $blocked->assertJsonPath('success', 0);
        $this->assertStringContainsString('Too many', $blocked->json('error'));
    }

    /**
     * Control: invalid input is still rejected by validation, before the limiter.
     */
    public function test_verify_phone_rejects_invalid_phone()
    {
        $this->postJson('/mapi/verify_phone', ['phone_number' => '123'])
            ->assertJsonPath('success', 0)
            ->assertJsonPath('error', 'Invalid phone number');
    }
}
