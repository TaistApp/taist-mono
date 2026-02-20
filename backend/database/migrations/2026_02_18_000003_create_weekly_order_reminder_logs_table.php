<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWeeklyOrderReminderLogsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('weekly_order_reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id');
            $table->string('week_key', 16);   // e.g., 2026-W08
            $table->string('slot_key', 16);   // e.g., 2:13 (weekday:slot)
            $table->unsignedTinyInteger('message_index');
            $table->string('timezone', 64);
            $table->timestamp('sent_at_utc');
            $table->string('sent_at_local', 32);
            $table->timestamps();

            $table->index(['user_id', 'week_key']);
            $table->unique(['user_id', 'week_key', 'slot_key'], 'weekly_reminder_unique_slot');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('weekly_order_reminder_logs');
    }
}
