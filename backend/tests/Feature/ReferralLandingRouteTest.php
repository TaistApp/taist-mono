<?php

namespace Tests\Feature;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

/**
 * Guards the target of the referral invite link.
 *
 * The "Share Invite Link" button and the referral SMS both hand out
 * https://taist.app/r/{code}. taist.app is the Vercel marketing site, which
 * proxies /r/* to this app — so if this route ever stops matching the codes we
 * generate, every invite already sitting in someone's texts 404s. Codes look
 * like REF-BALI3298 (letters, digits, and a hyphen), and the route's regex
 * constraint has to keep accepting exactly that shape.
 *
 * These resolve the route without dispatching it: the landing page reads the
 * database, and the test environment has no tables.
 */
class ReferralLandingRouteTest extends TestCase
{
    private function routeMatches(string $path): bool
    {
        try {
            Route::getRoutes()->match(Request::create($path, 'GET'));
            return true;
        } catch (NotFoundHttpException $e) {
            return false;
        }
    }

    /** The exact code format the app generates must resolve. */
    public function test_hyphenated_referral_code_resolves()
    {
        $this->assertTrue($this->routeMatches('/r/REF-BALI3298'));
    }

    /** The chef-prefilled variant carries a ?chef= query string. */
    public function test_referral_code_with_chef_query_resolves()
    {
        $this->assertTrue($this->routeMatches('/r/REF-BALI3298?chef=42'));
    }

    /** CONTROL: a bare /r/ with no code is not the landing page. */
    public function test_bare_r_path_does_not_resolve()
    {
        $this->assertFalse($this->routeMatches('/r/'));
    }

    /** CONTROL: the route is scoped to /r/{code}, not an arbitrary path. */
    public function test_unrelated_path_does_not_resolve()
    {
        $this->assertFalse($this->routeMatches('/not-a-referral-path'));
    }
}
