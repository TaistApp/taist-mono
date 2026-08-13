<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sent-at stamps for the active-order progression reminders (same varchar
 * unix-timestamp convention as acceptance_reminder_sent_at):
 * - omw_reminder_sent_at: "30 min to arrival — tap On My Way"
 * - completion_reminder_sent_at: "estimated cook time passed — mark complete
 *   and snap a dish photo"
 */
class AddProgressionReminderColumnsToOrders extends Migration
{
    public function up()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->string('omw_reminder_sent_at', 20)->nullable();
            $table->string('completion_reminder_sent_at', 20)->nullable();
        });
    }

    public function down()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->dropColumn(['omw_reminder_sent_at', 'completion_reminder_sent_at']);
        });
    }
}
