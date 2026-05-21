<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

class RenameWeeklyOrderReminderLogsToWeeklyNudgeLogs extends Migration
{
    public function up()
    {
        Schema::rename('weekly_order_reminder_logs', 'weekly_nudge_logs');
    }

    public function down()
    {
        Schema::rename('weekly_nudge_logs', 'weekly_order_reminder_logs');
    }
}
