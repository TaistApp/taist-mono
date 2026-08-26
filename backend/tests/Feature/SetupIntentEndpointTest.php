<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Guards the card-entry endpoints used by the native Stripe Payment Sheet.
 *
 * The sheet asks create_setup_intent for a client secret, confirms the card
 * itself, then posts the intent id to add_payment_method. Both talk to Stripe,
 * so what is asserted here is the wiring and the auth gate in front of it —
 * an unauthenticated caller must be turned away before any Stripe call.
 */
class SetupIntentEndpointTest extends TestCase
{
    public function test_create_setup_intent_route_is_registered()
    {
        $route = Route::getRoutes()->getByAction('App\Http\Controllers\MapiController@createSetupIntent');

        $this->assertNotNull($route, 'create_setup_intent must be routed to MapiController@createSetupIntent');
        $this->assertSame('mapi/create_setup_intent', $route->uri());
    }

    public function test_create_setup_intent_rejects_an_unauthenticated_caller()
    {
        $this->postJson('/mapi/create_setup_intent', [])->assertStatus(401);
    }

    public function test_add_payment_method_rejects_an_unauthenticated_caller()
    {
        $this->postJson('/mapi/add_payment_method', ['setup_intent_id' => 'seti_123'])
            ->assertStatus(401);
    }

    /**
     * Control: an endpoint that predates this change still answers the same
     * way, so a failure above points at the new wiring rather than at the
     * shared API-key gate.
     */
    public function test_get_payment_methods_still_rejects_an_unauthenticated_caller()
    {
        $this->postJson('/mapi/get_payment_methods', [])->assertStatus(401);
    }
}
