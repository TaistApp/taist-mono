<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Guards the public waitlist write endpoint.
 *
 * POST /admin-api-v2/waitlist sits outside the auth:adminapi group so the
 * marketing site can reach it, which for a stretch of mid-2026 left it
 * writable by anyone. A subscription-bombing bot used it to enter strangers'
 * real email addresses, and those people received Taist welcome mail.
 *
 * Callers now send the shared secret in X-Waitlist-Key. Enforcement is
 * conditional on the secret being configured so the change can deploy before
 * the value exists on Railway and Vercel without dropping real signups.
 *
 * No database tables exist in this environment, so a request that reaches the
 * Waitlist model would error. Every case below therefore also proves where the
 * request stopped: 401 means the guard fired before any database work, and 422
 * means the guard passed and validation rejected the empty payload instead.
 */
class WaitlistSharedSecretTest extends TestCase
{
    private const SECRET = 'test-waitlist-secret';

    private function configureSecret(?string $value): void
    {
        config(['app.waitlist_api_key' => $value]);
    }

    public function test_configured_secret_rejects_request_with_no_header()
    {
        $this->configureSecret(self::SECRET);

        $this->postJson('/admin-api-v2/waitlist', [
            'email' => 'bot@example.com',
            'firstName' => 'Bot',
            'zip' => '46032',
            'userType' => 1,
        ])->assertStatus(401)->assertJsonPath('error', 'Unauthorized');
    }

    public function test_configured_secret_rejects_wrong_header()
    {
        $this->configureSecret(self::SECRET);

        $this->postJson('/admin-api-v2/waitlist', [
            'email' => 'bot@example.com',
            'firstName' => 'Bot',
            'zip' => '46032',
            'userType' => 1,
        ], ['X-Waitlist-Key' => 'not-the-secret'])
            ->assertStatus(401)->assertJsonPath('error', 'Unauthorized');
    }

    /**
     * A near-miss must fail too — hash_equals compares the whole value, so a
     * correct prefix earns nothing.
     */
    public function test_configured_secret_rejects_prefix_of_the_secret()
    {
        $this->configureSecret(self::SECRET);

        $this->postJson('/admin-api-v2/waitlist', [
            'email' => 'bot@example.com',
            'firstName' => 'Bot',
            'zip' => '46032',
            'userType' => 1,
        ], ['X-Waitlist-Key' => substr(self::SECRET, 0, 10)])
            ->assertStatus(401);
    }

    /**
     * With the right header the guard steps aside: an empty payload now fails
     * validation (422) rather than authorization (401).
     */
    public function test_matching_header_passes_the_guard()
    {
        $this->configureSecret(self::SECRET);

        $this->postJson('/admin-api-v2/waitlist', [], ['X-Waitlist-Key' => self::SECRET])
            ->assertStatus(422);
    }

    /**
     * CONTROL: with no secret configured the endpoint behaves exactly as it did
     * before, so deploying this ahead of the Railway and Vercel variables can
     * never reject a real signup. Once the key is set on both, the cases above
     * are what actually close the hole.
     */
    public function test_unset_secret_leaves_the_endpoint_open()
    {
        $this->configureSecret(null);

        $this->postJson('/admin-api-v2/waitlist', [])
            ->assertStatus(422);
    }
}
