<?php

namespace App\Services;

/**
 * Decides whether an outbound transactional email is allowed to reach Resend.
 *
 * Mirrors the SMS gate in TwilioService, but deliberately inverts the default.
 * SMS costs real money per send, so it is off outside production. Email is
 * free and staging sends are genuinely useful for manual testing, so email
 * stays on everywhere and only specific recipients are dropped.
 *
 * The recipient that must always be dropped is the E2E suite's synthetic
 * domain (tests/e2e/config.js). It has no MX record, so every message
 * addressed there is a guaranteed hard bounce, and the E2E suite runs before
 * every staging push — the bounces accumulate against the taist.app sender
 * reputation and show up in the Resend dashboard.
 */
class EmailGate
{
    /** Synthetic recipient domain used by tests/e2e/helpers.js. No MX record. */
    public const E2E_DOMAIN = 'e2e-test.taist.app';

    /**
     * @param  string|null  $email
     */
    public static function shouldSend($email): bool
    {
        return self::suppressionReason($email) === null;
    }

    /**
     * Why this recipient is being skipped, or null when the send may proceed.
     *
     * @param  string|null  $email
     */
    public static function suppressionReason($email): ?string
    {
        if (self::isE2eRecipient($email)) {
            return 'E2E test recipient: ' . self::E2E_DOMAIN . ' has no MX record, so the send would hard-bounce';
        }

        if (!self::sendingEnabled()) {
            return 'EMAIL_ENABLED is off for this environment';
        }

        return null;
    }

    /**
     * Second layer: a kill switch for all outbound email. Defaults to ON so
     * that staging keeps behaving like production for manual testing; set
     * EMAIL_ENABLED=false to silence an environment entirely.
     */
    public static function sendingEnabled(): bool
    {
        return filter_var(env('EMAIL_ENABLED', true), FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * @param  string|null  $email
     */
    public static function isE2eRecipient($email): bool
    {
        $address = strtolower(trim((string) $email));
        $at = strrpos($address, '@');

        if ($at === false) {
            return false;
        }

        $domain = substr($address, $at + 1);

        return $domain === self::E2E_DOMAIN
            || str_ends_with($domain, '.' . self::E2E_DOMAIN);
    }
}
