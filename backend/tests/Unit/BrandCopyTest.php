<?php

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Guards Taist's core positioning in public-facing pages.
 *
 * Taist is not a delivery service — a personal chef comes to the customer's
 * home and cooks there. The marketing site says it outright ("Dinner made.
 * Not delivered."), so any page claiming food is "delivered to your door"
 * actively misdescribes the product to someone deciding whether to sign up.
 * The referral landing page shipped with exactly that line in Aug 2026.
 *
 * These views are the pages strangers see first — invite links and shared
 * chef profiles — so the wording matters more here than almost anywhere.
 */
class BrandCopyTest extends TestCase
{
    /** Phrases that frame Taist as delivery rather than in-home cooking. */
    private const DELIVERY_CLAIMS = '/deliver(ed|y|s)?\s+(to\s+your\s+door|to\s+you\b)|food\s+delivery/i';

    private function bladeViews(): array
    {
        return glob(__DIR__ . '/../../resources/views/*.blade.php') ?: [];
    }

    public function test_public_views_do_not_claim_delivery()
    {
        $this->assertNotEmpty($this->bladeViews(), 'No blade views found to scan.');

        $offenders = [];
        foreach ($this->bladeViews() as $view) {
            if (preg_match(self::DELIVERY_CLAIMS, file_get_contents($view), $m)) {
                $offenders[] = basename($view) . ': "' . $m[0] . '"';
            }
        }

        $this->assertSame([], $offenders, "Views describe Taist as a delivery service:\n" . implode("\n", $offenders));
    }

    /**
     * CONTROL: the pattern actually catches the phrasing it is meant to catch,
     * so a passing test above means the views are clean — not that the regex
     * silently stopped matching anything.
     */
    public function test_pattern_detects_delivery_phrasing()
    {
        $this->assertRegExp(self::DELIVERY_CLAIMS, 'Homemade food from local chefs, delivered to your door.');
        $this->assertRegExp(self::DELIVERY_CLAIMS, 'Fast food delivery near you');
    }

    /** CONTROL: it does not fire on the correct in-home wording. */
    public function test_pattern_allows_in_home_wording()
    {
        $this->assertNotRegExp(
            self::DELIVERY_CLAIMS,
            'A personal chef comes to your kitchen, cooks a fresh meal, and cleans up before they leave.'
        );
    }
}
