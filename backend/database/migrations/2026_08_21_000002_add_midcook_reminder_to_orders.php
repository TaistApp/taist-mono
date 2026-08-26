<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sent-at stamp for the mid-cook "don't forget to complete the order in the
 * app before you leave" nudge (same varchar unix convention as the other
 * reminder stamps). Fires partway through the cook so the chef hears it while
 * still at the customer's home, not after they've packed up.
 */
class AddMidcookReminderToOrders extends Migration
{
    public function up()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->string('midcook_reminder_sent_at', 20)->nullable();
        });
    }

    public function down()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->dropColumn('midcook_reminder_sent_at');
        });
    }
}
