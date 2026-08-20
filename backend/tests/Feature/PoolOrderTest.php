<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Pool ordering ("request a dish"): customer opens a category request, every
 * eligible chef is offered it, first claim wins and becomes a normal
 * Accepted order at the winner's menu price. Feature-flagged off in
 * production. Charging is stubbed in the testing env (payment_token gets a
 * pi_test_ stamp) — the fee math itself is covered by OrdersTest.
 */
class PoolOrderTest extends TestCase
{
    private const API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';

    protected function setUp(): void
    {
        parent::setUp();

        $this->app['env'] = 'testing'; // pin against env pollution

        foreach (['tbl_users', 'tbl_menus', 'tbl_categories', 'tbl_pool_requests', 'tbl_orders', 'tbl_availabilities', 'tbl_availability_overrides', 'tbl_payment_method_listener', 'tbl_notifications'] as $t) {
            Schema::dropIfExists($t);
        }

        Schema::create('tbl_availability_overrides', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            $table->integer('chef_id')->nullable();
            $table->date('override_date');
            $table->string('start_time')->nullable();
            $table->string('end_time')->nullable();
            $table->string('status')->nullable();
            $table->timestamps();
        });

        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('email')->nullable();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('address')->nullable();
            $table->string('address2')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip')->nullable();
            $table->string('parking_type')->nullable();
            $table->string('parking_instructions')->nullable();
            $table->tinyInteger('user_type')->default(1);
            $table->tinyInteger('verified')->default(1);
            $table->tinyInteger('is_pending')->default(0);
            $table->tinyInteger('is_paused')->default(0);
            $table->string('api_token')->nullable();
            $table->string('fcm_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('tbl_menus', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            $table->string('title')->nullable();
            $table->double('price')->default(0);
            $table->string('category_ids')->nullable();
            $table->double('estimated_time')->default(60);
            $table->tinyInteger('is_live')->default(1);
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('tbl_categories', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->integer('chef_id')->default(0);
            $table->integer('menu_id')->default(0);
            $table->tinyInteger('status')->default(2);
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('tbl_pool_requests', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('customer_user_id');
            $table->integer('category_id');
            $table->integer('portions')->default(1);
            $table->text('notes')->nullable();
            $table->string('request_date', 10);
            $table->string('request_time', 5);
            $table->string('timezone', 64)->nullable();
            $table->integer('request_timestamp');
            $table->string('status', 20)->default('open');
            $table->integer('claimed_by_chef_id')->nullable();
            $table->integer('claimed_menu_id')->nullable();
            $table->integer('order_id')->nullable();
            $table->double('price_min')->nullable();
            $table->double('price_max')->nullable();
            $table->integer('expires_at');
            $table->integer('created_at');
            $table->integer('updated_at');
        });

        Schema::create('tbl_orders', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('chef_user_id')->nullable();
            $table->integer('menu_id')->nullable();
            $table->integer('customer_user_id')->nullable();
            $table->integer('amount')->nullable();
            $table->double('total_price')->nullable();
            $table->string('address')->nullable();
            $table->string('parking_type')->nullable();
            $table->string('parking_instructions')->nullable();
            $table->integer('order_date')->nullable();
            $table->string('order_date_new')->nullable();
            $table->string('order_time')->nullable();
            $table->string('order_timezone')->nullable();
            $table->text('notes')->nullable();
            $table->integer('status')->nullable();
            $table->string('payment_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('tbl_availabilities', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            foreach (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saterday', 'sunday'] as $day) {
                $table->string($day . '_start')->nullable();
                $table->string($day . '_end')->nullable();
            }
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('tbl_payment_method_listener', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            $table->string('card_token')->nullable();
            $table->string('stripe_account_id')->nullable();
            $table->tinyInteger('active')->default(1);
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('tbl_notifications', function (Blueprint $table) {
            $table->increments('id');
            $table->string('title')->nullable();
            $table->text('body')->nullable();
            $table->string('image')->nullable();
            $table->string('fcm_token')->nullable();
            $table->integer('user_id')->nullable();
            $table->integer('navigation_id')->nullable();
            $table->string('role')->nullable();
            $table->string('category')->nullable();
            $table->timestamps();
        });

        // Cast: customer 1, chefs 2 + 3 (both eligible), category 5
        $userDefaults = ['address' => null, 'address2' => null, 'zip' => null, 'created_at' => now(), 'updated_at' => now()];
        DB::table('tbl_users')->insert([
            array_merge($userDefaults, ['id' => 1, 'email' => 'cust@example.com', 'first_name' => 'Dayne', 'address' => '10903 Lantern View Dr', 'address2' => 'Apt 4B', 'city' => 'Fishers', 'state' => 'Indiana', 'zip' => '46038', 'user_type' => 1, 'verified' => 1, 'api_token' => 'tok_cust']),
            array_merge($userDefaults, ['id' => 2, 'email' => 'chef2@example.com', 'first_name' => 'Stefanie', 'city' => 'Fishers', 'state' => 'Indiana', 'user_type' => 2, 'verified' => 1, 'api_token' => 'tok_chef2']),
            array_merge($userDefaults, ['id' => 3, 'email' => 'chef3@example.com', 'first_name' => 'Marco', 'city' => 'Carmel', 'state' => 'Indiana', 'user_type' => 2, 'verified' => 1, 'api_token' => 'tok_chef3']),
        ]);

        DB::table('tbl_categories')->insert(['id' => 5, 'name' => 'Italian', 'status' => 2, 'created_at' => now(), 'updated_at' => now()]);

        DB::table('tbl_menus')->insert([
            ['id' => 10, 'user_id' => 2, 'title' => 'Lasagna', 'price' => 50.00, 'category_ids' => '5,7', 'is_live' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 11, 'user_id' => 3, 'title' => 'Carbonara', 'price' => 65.00, 'category_ids' => '5', 'is_live' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Both chefs available all week, all day
        foreach ([2, 3] as $chefId) {
            $row = ['user_id' => $chefId, 'created_at' => now(), 'updated_at' => now()];
            foreach (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saterday', 'sunday'] as $day) {
                $row[$day . '_start'] = '00:01';
                $row[$day . '_end'] = '23:59';
            }
            DB::table('tbl_availabilities')->insert($row);
        }

        // Customer's saved card + both chefs' Stripe accounts
        DB::table('tbl_payment_method_listener')->insert([
            ['user_id' => 1, 'card_token' => 'pm_test', 'active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => 2, 'stripe_account_id' => 'acct_chef2', 'active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => 3, 'stripe_account_id' => 'acct_chef3', 'active' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * The auth guard caches the first resolved user for the app instance, so
     * switching api_tokens mid-test silently keeps the previous persona.
     * Call between requests made as different users.
     */
    private function asFreshUser(): void
    {
        $this->app['auth']->forgetGuards();
    }

    private function futureRequest(): array
    {
        $ts = time() + 3 * 24 * 3600; // 3 days out — clears the 2h lead rule
        return [
            'category_id' => 5,
            'portions' => 2,
            'notes' => 'Extra parmesan please',
            'request_date' => date('Y-m-d', $ts),
            'request_time' => date('H:i', $ts),
            'request_timestamp' => $ts,
            'timezone' => 'America/Indiana/Indianapolis',
        ];
    }

    private function createRequest(array $overrides = [])
    {
        return $this->postJson('/mapi/pool/create_request?api_token=tok_cust',
            array_merge($this->futureRequest(), $overrides),
            ['apiKey' => self::API_KEY]);
    }

    // ---- config / gating -------------------------------------------------

    public function test_config_enabled_outside_production(): void
    {
        $resp = $this->getJson('/mapi/pool/config?api_token=tok_cust', ['apiKey' => self::API_KEY]);

        $resp->assertStatus(200)->assertJsonPath('success', 1)->assertJsonPath('data.enabled', true);
    }

    public function test_disabled_in_production_env(): void
    {
        $this->app['env'] = 'production';

        $config = $this->getJson('/mapi/pool/config?api_token=tok_cust', ['apiKey' => self::API_KEY]);
        $config->assertJsonPath('data.enabled', false);

        $create = $this->createRequest();
        $create->assertJsonPath('success', 0);
        $this->assertSame(0, DB::table('tbl_pool_requests')->count());
    }

    // ---- create ----------------------------------------------------------

    public function test_create_request_returns_price_range_from_eligible_chefs(): void
    {
        $resp = $this->createRequest();

        $resp->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertSame(2, $resp->json('data.chef_count'));
        // 2 portions: Stefanie $100, Marco $130
        $this->assertEquals(100.0, $resp->json('data.request.price_min'));
        $this->assertEquals(130.0, $resp->json('data.request.price_max'));
        $this->assertSame('open', DB::table('tbl_pool_requests')->first()->status);
    }

    public function test_create_fails_with_no_eligible_chefs(): void
    {
        DB::table('tbl_categories')->insert(['id' => 99, 'name' => 'Sushi', 'status' => 2, 'created_at' => now(), 'updated_at' => now()]);

        $resp = $this->createRequest(['category_id' => 99]); // category exists, but no chef has a live menu in it

        $resp->assertJsonPath('success', 0);
        $this->assertStringContainsString('No chefs are available', $resp->json('error'));
    }

    public function test_create_requires_lead_time_and_payment_method(): void
    {
        $soon = time() + 600;
        $this->createRequest([
            'request_timestamp' => $soon,
            'request_date' => date('Y-m-d', $soon),
            'request_time' => date('H:i', $soon),
        ])->assertJsonPath('success', 0);

        DB::table('tbl_payment_method_listener')->where('user_id', 1)->delete();
        $this->createRequest()->assertJsonPath('success', 0);
    }

    // ---- chef feed -------------------------------------------------------

    public function test_eligible_chef_sees_request_with_their_own_price(): void
    {
        $this->createRequest()->assertJsonPath('success', 1);

        $this->asFreshUser();
        $feed = $this->getJson('/mapi/pool/open_requests?api_token=tok_chef2', ['apiKey' => self::API_KEY]);

        $feed->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertCount(1, $feed->json('data'));
        $this->assertSame('Italian', $feed->json('data.0.category_name'));
        $this->assertEquals(100.0, $feed->json('data.0.your_price')); // 2 × $50
        $this->assertSame('Dayne', $feed->json('data.0.customer_first_name'));
    }

    public function test_chef_without_category_menu_sees_empty_feed(): void
    {
        $this->createRequest()->assertJsonPath('success', 1);
        DB::table('tbl_menus')->where('user_id', 3)->update(['category_ids' => '8']);

        $this->asFreshUser();
        $feed = $this->getJson('/mapi/pool/open_requests?api_token=tok_chef3', ['apiKey' => self::API_KEY]);

        $this->assertCount(0, $feed->json('data'));
    }

    // ---- claim (the race) ------------------------------------------------

    public function test_first_claim_wins_and_creates_accepted_paid_order(): void
    {
        $this->createRequest()->assertJsonPath('success', 1);
        $poolId = DB::table('tbl_pool_requests')->first()->id;

        $this->asFreshUser();
        $claim = $this->postJson('/mapi/pool/claim_request?api_token=tok_chef2',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY]);

        $claim->assertStatus(200)->assertJsonPath('success', 1);

        $order = DB::table('tbl_orders')->first();
        $this->assertSame(2, (int) $order->chef_user_id);
        $this->assertSame(2, (int) $order->status, 'claiming IS acceptance');
        $this->assertEquals(100.0, (float) $order->total_price, "winner's menu price × portions");
        $this->assertStringStartsWith('pi_test_', $order->payment_token, 'customer charged at claim');
        $this->assertStringContainsString('Apt 4B', $order->address, 'unit number carried onto the order');

        $pool = DB::table('tbl_pool_requests')->first();
        $this->assertSame('claimed', $pool->status);
        $this->assertSame((int) $order->id, (int) $pool->order_id);
    }

    public function test_second_claim_loses_the_race(): void
    {
        $this->createRequest()->assertJsonPath('success', 1);
        $poolId = DB::table('tbl_pool_requests')->first()->id;

        $this->asFreshUser();
        $this->postJson('/mapi/pool/claim_request?api_token=tok_chef2',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY])->assertJsonPath('success', 1);

        $this->asFreshUser();
        $second = $this->postJson('/mapi/pool/claim_request?api_token=tok_chef3',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY]);

        $second->assertJsonPath('success', 0)->assertJsonPath('already_claimed', 1);
        $this->assertSame(1, DB::table('tbl_orders')->count(), 'no second order created');
        $this->assertSame(2, (int) DB::table('tbl_pool_requests')->first()->claimed_by_chef_id);
    }

    public function test_ineligible_chef_cannot_claim(): void
    {
        $this->createRequest()->assertJsonPath('success', 1);
        $poolId = DB::table('tbl_pool_requests')->first()->id;
        DB::table('tbl_menus')->where('user_id', 3)->update(['category_ids' => '8']);

        $this->asFreshUser();
        $claim = $this->postJson('/mapi/pool/claim_request?api_token=tok_chef3',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY]);

        $claim->assertJsonPath('success', 0);
        $this->assertSame('open', DB::table('tbl_pool_requests')->first()->status, 'request stays open');
    }

    // ---- customer view + expiry ------------------------------------------

    public function test_customer_sees_own_requests_with_claim_details(): void
    {
        $this->createRequest()->assertJsonPath('success', 1);
        $poolId = DB::table('tbl_pool_requests')->first()->id;
        $this->asFreshUser();
        $this->postJson('/mapi/pool/claim_request?api_token=tok_chef2',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY]);

        $this->asFreshUser();
        $mine = $this->getJson('/mapi/pool/my_requests?api_token=tok_cust', ['apiKey' => self::API_KEY]);

        $mine->assertJsonPath('success', 1);
        $this->assertSame('claimed', $mine->json('data.0.status'));
        $this->assertSame('Stefanie', $mine->json('data.0.chef_first_name'));
        $this->assertNotNull($mine->json('data.0.order_id'));
    }

    // ---- state fencing ---------------------------------------------------

    public function test_out_of_state_chef_neither_sees_nor_claims(): void
    {
        // Marco moves to Illinois — same category menu, wrong state
        DB::table('tbl_users')->where('id', 3)->update(['state' => 'Illinois']);
        $this->createRequest()->assertJsonPath('success', 1);
        $poolId = DB::table('tbl_pool_requests')->first()->id;

        $this->asFreshUser();
        $feed = $this->getJson('/mapi/pool/open_requests?api_token=tok_chef3', ['apiKey' => self::API_KEY]);
        $this->assertCount(0, $feed->json('data'), 'IL chef must not see an IN request');

        $this->asFreshUser();
        $claim = $this->postJson('/mapi/pool/claim_request?api_token=tok_chef3',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY]);
        $claim->assertJsonPath('success', 0);
        $this->assertSame('open', DB::table('tbl_pool_requests')->first()->status);

        // And the fan-out price range only counted the in-state chef
        $this->assertEquals(100.0, (float) DB::table('tbl_pool_requests')->first()->price_max);
    }

    public function test_customer_without_state_cannot_create_request(): void
    {
        DB::table('tbl_users')->where('id', 1)->update(['state' => null]);

        $resp = $this->createRequest();

        $resp->assertJsonPath('success', 0);
        $this->assertStringContainsString('state', strtolower($resp->json('error')));
    }

    // ---- customer cancel -------------------------------------------------

    public function test_customer_can_cancel_own_open_request(): void
    {
        $this->createRequest()->assertJsonPath('success', 1);
        $poolId = DB::table('tbl_pool_requests')->first()->id;

        $cancel = $this->postJson('/mapi/pool/cancel_request?api_token=tok_cust',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY]);

        $cancel->assertJsonPath('success', 1);
        $this->assertSame('cancelled', DB::table('tbl_pool_requests')->first()->status);

        // A cancelled request is gone from feeds and unclaimable
        $this->asFreshUser();
        $claim = $this->postJson('/mapi/pool/claim_request?api_token=tok_chef2',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY]);
        $claim->assertJsonPath('success', 0);
        $this->assertSame(0, DB::table('tbl_orders')->count());
    }

    public function test_claimed_request_cannot_be_cancelled(): void
    {
        $this->createRequest()->assertJsonPath('success', 1);
        $poolId = DB::table('tbl_pool_requests')->first()->id;
        $this->asFreshUser();
        $this->postJson('/mapi/pool/claim_request?api_token=tok_chef2',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY])->assertJsonPath('success', 1);

        $this->asFreshUser();
        $cancel = $this->postJson('/mapi/pool/cancel_request?api_token=tok_cust',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY]);

        $cancel->assertJsonPath('success', 0);
        $this->assertStringContainsString('already accepted', $cancel->json('error'));
        $this->assertSame('claimed', DB::table('tbl_pool_requests')->first()->status);
    }

    public function test_cannot_cancel_someone_elses_request(): void
    {
        $this->createRequest()->assertJsonPath('success', 1);
        $poolId = DB::table('tbl_pool_requests')->first()->id;

        // chef2's token is a different user — must not be able to cancel
        $this->asFreshUser();
        $cancel = $this->postJson('/mapi/pool/cancel_request?api_token=tok_chef2',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY]);

        $cancel->assertJsonPath('success', 0);
        $this->assertSame('open', DB::table('tbl_pool_requests')->first()->status);
    }

    public function test_unavailable_chef_still_sees_request(): void
    {
        // Chef 2 has NO availability row at all now — by design the pool
        // ignores availability; chefs self-select by claiming.
        DB::table('tbl_availabilities')->where('user_id', 2)->delete();
        $this->createRequest()->assertJsonPath('success', 1);

        $this->asFreshUser();
        $feed = $this->getJson('/mapi/pool/open_requests?api_token=tok_chef2', ['apiKey' => self::API_KEY]);

        $this->assertCount(1, $feed->json('data'));
    }

    public function test_expiry_command_expires_stale_open_requests(): void
    {
        $this->createRequest()->assertJsonPath('success', 1);
        DB::table('tbl_pool_requests')->update(['expires_at' => time() - 60]);

        $this->artisan('pool:expire-requests')->assertExitCode(0);

        $this->assertSame('expired', DB::table('tbl_pool_requests')->first()->status);

        // An expired request is no longer claimable
        $poolId = DB::table('tbl_pool_requests')->first()->id;
        $this->asFreshUser();
        $claim = $this->postJson('/mapi/pool/claim_request?api_token=tok_chef2',
            ['pool_request_id' => $poolId], ['apiKey' => self::API_KEY]);
        $claim->assertJsonPath('success', 0);
    }
}
