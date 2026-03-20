<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAcceptanceDeadlineToOrders extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            // Add acceptance_deadline field (Unix timestamp as varchar to match existing timestamp format)
            $table->string('acceptance_deadline', 50)->nullable()->after('order_date');

            // Add index for efficient querying of expired orders
            $table->index(['status', 'acceptance_deadline'], 'idx_orders_status_deadline');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_status_deadline');
            $table->dropColumn('acceptance_deadline');
        });
    }
}
