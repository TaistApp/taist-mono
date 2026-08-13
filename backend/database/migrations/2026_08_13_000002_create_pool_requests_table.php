<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Uber-style pool ordering: a customer requests a dish category for a
 * date/time; every eligible chef (verified, live menu item in that category,
 * available at that time) is notified, and the first to accept claims the
 * request — which creates a normal order at the winning chef's own menu
 * price. Unclaimed requests expire.
 *
 * Signed INT user/order FKs to match the legacy tbl_users/tbl_orders id
 * types. Unix-int timestamps, $timestamps = false on the model.
 */
class CreatePoolRequestsTable extends Migration
{
    public function up()
    {
        Schema::create('tbl_pool_requests', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('customer_user_id');
            $table->integer('category_id');
            $table->integer('portions')->default(1);
            $table->text('notes')->nullable();
            $table->string('request_date', 10);      // YYYY-MM-DD (request's own tz)
            $table->string('request_time', 5);       // HH:mm
            $table->string('timezone', 64)->nullable();
            $table->integer('request_timestamp');    // unix arrival moment
            $table->string('status', 20)->default('open'); // open|claimed|expired|cancelled
            $table->integer('claimed_by_chef_id')->nullable();
            $table->integer('claimed_menu_id')->nullable();
            $table->integer('order_id')->nullable();
            $table->double('price_min')->nullable(); // snapshot of eligible price range
            $table->double('price_max')->nullable();
            $table->integer('expires_at');
            $table->integer('created_at');
            $table->integer('updated_at');

            $table->index(['status', 'expires_at']);
            $table->index('customer_user_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('tbl_pool_requests');
    }
}
