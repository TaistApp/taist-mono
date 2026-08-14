<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Chefs must be notified of every review at creation time. The app only
 * calls tip_order_payment when a tip was left, so the notification cannot
 * live there: a review without a tip (or with a failed tip charge) would
 * never notify the chef — which is exactly the bug this guards against.
 * The push itself is skipped in testing (Firebase unconfigured); these
 * tests assert the DB notification row that feeds the in-app list.
 */
class ReviewNotificationTest extends TestCase
{
    private const API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';

    private const CHEF_ID = 71;
    private const CUSTOMER_ID = 42;
    private const ORDER_ID = 9001;

    protected function setUp(): void
    {
        parent::setUp();

        $this->app['env'] = 'testing'; // pin against env pollution

        foreach (['tbl_users', 'tbl_reviews', 'notifications'] as $t) {
            Schema::dropIfExists($t);
        }

        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('email')->nullable();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('photo')->nullable();
            $table->tinyInteger('user_type')->default(1);
            $table->string('api_token')->nullable();
            $table->string('fcm_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('tbl_reviews', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('order_id');
            $table->integer('from_user_id');
            $table->integer('to_user_id');
            $table->integer('rating')->default(0);
            $table->text('review')->nullable();
            $table->double('tip_amount')->default(0);
            $table->string('source')->nullable();
            $table->integer('parent_review_id')->nullable();
            $table->text('ai_generation_params')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('title');
            $table->string('body');
            $table->string('image')->nullable();
            $table->string('dish_image')->nullable();
            $table->string('fcm_token');
            $table->unsignedBigInteger('user_id');
            $table->string('navigation_id')->default('');
            $table->string('role')->default('customer');
            $table->boolean('is_read')->default(false);
            $table->string('category', 50)->default('order_update');
            $table->timestamps();
        });

        DB::table('tbl_users')->insert([
            ['id' => self::CHEF_ID, 'email' => 'chef@example.com', 'first_name' => 'Stef', 'user_type' => 2, 'api_token' => 'tok_chef', 'fcm_token' => 'chef-token'],
            ['id' => self::CUSTOMER_ID, 'email' => 'customer@example.com', 'first_name' => 'Cust', 'user_type' => 1, 'api_token' => 'tok_cust', 'fcm_token' => 'customer-token'],
        ]);
    }

    private function createReview(array $overrides = [])
    {
        return $this->postJson('/mapi/create_review?api_token=tok_cust', array_merge([
            'order_id' => self::ORDER_ID,
            'from_user_id' => self::CUSTOMER_ID,
            'to_user_id' => self::CHEF_ID,
            'rating' => 5,
            'review' => 'Amazing meal!',
            'tip_amount' => 0,
        ], $overrides), ['apiKey' => self::API_KEY]);
    }

    /** The bug: a review with no tip must still notify the chef. */
    public function test_review_without_tip_creates_chef_notification(): void
    {
        $resp = $this->createReview();

        $resp->assertStatus(200)->assertJsonPath('success', 1);

        $notif = DB::table('notifications')->where('user_id', self::CHEF_ID)->first();
        $this->assertNotNull($notif, 'Chef got no notification row for a no-tip review');
        $this->assertSame('Review for chef', $notif->title);
        $this->assertSame('chef', $notif->role);
        $this->assertEquals(self::ORDER_ID, $notif->navigation_id);

        $body = json_decode($notif->body, true);
        $this->assertSame('Amazing meal!', $body['review']);
        $this->assertEquals(5, $body['ratings']);
    }

    /** Exactly one notification per review — no duplicates. */
    public function test_review_creates_exactly_one_notification(): void
    {
        $this->createReview();

        $this->assertEquals(1, DB::table('notifications')->count());
    }

    /** A tipped review also notifies at creation (tip charge notifies separately). */
    public function test_review_with_tip_still_notifies_on_creation(): void
    {
        $resp = $this->createReview(['tip_amount' => 10]);

        $resp->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertEquals(1, DB::table('notifications')->where('user_id', self::CHEF_ID)->count());
    }

    /** The notification targets the chef, never the reviewing customer. */
    public function test_notification_goes_to_chef_not_customer(): void
    {
        $this->createReview();

        $this->assertEquals(0, DB::table('notifications')->where('user_id', self::CUSTOMER_ID)->count());
    }

    /** Control: an unknown chef id saves the review but sends nothing. */
    public function test_unknown_chef_saves_review_without_notification(): void
    {
        $resp = $this->createReview(['to_user_id' => 999999]);

        $resp->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertEquals(1, DB::table('tbl_reviews')->count());
        $this->assertEquals(0, DB::table('notifications')->count());
    }

    /** Control: a bad api key creates neither review nor notification. */
    public function test_invalid_api_key_creates_nothing(): void
    {
        $resp = $this->postJson('/mapi/create_review?api_token=tok_cust', [
            'order_id' => self::ORDER_ID,
            'from_user_id' => self::CUSTOMER_ID,
            'to_user_id' => self::CHEF_ID,
            'rating' => 5,
            'review' => 'Nope',
            'tip_amount' => 0,
        ], ['apiKey' => 'wrong-key']);

        $resp->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertEquals(0, DB::table('tbl_reviews')->count());
        $this->assertEquals(0, DB::table('notifications')->count());
    }
}
