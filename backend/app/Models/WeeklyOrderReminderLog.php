<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WeeklyOrderReminderLog extends Model
{
    protected $table = 'weekly_order_reminder_logs';

    protected $fillable = [
        'user_id',
        'week_key',
        'slot_key',
        'message_index',
        'timezone',
        'sent_at_utc',
        'sent_at_local',
    ];
}
