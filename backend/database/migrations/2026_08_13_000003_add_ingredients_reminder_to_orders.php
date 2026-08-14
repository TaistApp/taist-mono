<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sent-at stamp for the 24-hours-before-arrival "ingredients bought?" chef
 * nudge (same varchar unix convention as the other reminder stamps).
 */
class AddIngredientsReminderToOrders extends Migration
{
    public function up()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->string('ingredients_reminder_sent_at', 20)->nullable();
        });
    }

    public function down()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->dropColumn('ingredients_reminder_sent_at');
        });
    }
}
