<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAcceptanceReminderSentAtToOrders extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            // Unix timestamp (varchar, matching acceptance_deadline) of the last
            // 5-minute acceptance reminder push sent to the chef.
            $table->string('acceptance_reminder_sent_at', 50)->nullable()->after('acceptance_deadline');
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
            $table->dropColumn('acceptance_reminder_sent_at');
        });
    }
}
