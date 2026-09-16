<?php

namespace Tests\Feature;

use App\Console\Commands\ProcessExpiredOrders;
use App\Models\Orders;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use ReflectionMethod;
use Tests\TestCase;

/**
 * When an order is auto-cancelled for lapsing the acceptance window, the chef
 * used to be told nothing at all — only the customer was notified. Chef home
 * has no tab for a cancelled order either, so from the chef's side the order
 * simply ceased to exist. That is exactly how a real staging order went
 * unnoticed.
 *
 * The in-app record is deliberately written independently of the push, because
 * push is the unreliable half: a chef may have no token at all.
 */
class OrderExpiryChefNotificationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        foreach (['tbl_users', 'tbl_orders', 'notifications'] as $t) {
            Schema::dropIfExists($t);
        }

        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('first_name')->nullable();
            $table->string('photo')->nullable();
            $table->string('fcm_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('tbl_orders', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('chef_user_id')->nullable();
            $table->integer('customer_user_id')->nullable();
            $table->string('order_time')->nullable();
            $table->integer('status')->default(1);
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('notifications', function (Blueprint $table) {
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

        // Chef 2 has no push token — the case that must still reach the inbox.
        DB::table('tbl_users')->insert([
            ['id' => 1, 'first_name' => 'Dayne', 'photo' => 'cust.jpg', 'fcm_token' => null],
            ['id' => 2, 'first_name' => 'Stefanie', 'photo' => 'chef.jpg', 'fcm_token' => null],
        ]);

        DB::table('tbl_orders')->insert([
            'id' => 664,
            'chef_user_id' => 2,
            'customer_user_id' => 1,
            'order_time' => '14:00',
            'status' => 4,
        ]);
    }

    private function notifyChef(int $orderId): void
    {
        $method = new ReflectionMethod(ProcessExpiredOrders::class, 'notifyChef');
        $method->setAccessible(true);
        $method->invoke(app(ProcessExpiredOrders::class), Orders::find($orderId));
    }

    public function test_chef_gets_an_inbox_record_even_without_a_push_token(): void
    {
        $this->notifyChef(664);

        $row = DB::table('notifications')->where('user_id', 2)->first();

        $this->assertNotNull($row, 'chef was told nothing');
        $this->assertSame('chef', $row->role);
        $this->assertSame('order_expired', $row->category);
    }

    public function test_the_record_opens_the_order_when_tapped(): void
    {
        $this->notifyChef(664);

        $row = DB::table('notifications')->where('user_id', 2)->first();

        // role 'chef' + navigation_id is what routes to the chef order detail.
        $this->assertSame(664, (int) $row->navigation_id);
    }

    public function test_the_message_names_the_customer_and_the_slot(): void
    {
        $this->notifyChef(664);

        $row = DB::table('notifications')->where('user_id', 2)->first();

        $this->assertStringContainsString('Dayne', $row->body);
        $this->assertStringContainsString('14:00', $row->body);
        $this->assertStringContainsString('refunded', $row->body);
    }

    // Control: a missing chef is skipped quietly rather than throwing and
    // rolling back a refund that has already been issued.
    public function test_missing_chef_does_not_throw(): void
    {
        DB::table('tbl_orders')->where('id', 664)->update(['chef_user_id' => 999]);

        $this->notifyChef(664);

        $this->assertSame(0, DB::table('notifications')->count());
    }
}
