<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Orders;
use App\Listener;
use App\Helpers\TimezoneHelper;

return new class extends Migration
{
    public function up()
    {
        Orders::whereNull('order_date_new')
            ->chunkById(100, function ($orders) {
                foreach ($orders as $order) {
                    $timestamp = (int) $order->order_date;
                    if ($timestamp <= 0) continue;

                    $chef = Listener::find($order->chef_user_id);
                    $chefTimezone = $chef
                        ? TimezoneHelper::getTimezoneForState($chef->state)
                        : TimezoneHelper::getDefaultTimezone();

                    $dt = new \DateTime("@{$timestamp}");
                    $dt->setTimezone(new \DateTimeZone($chefTimezone));

                    $order->update([
                        'order_date_new' => $dt->format('Y-m-d'),
                        'order_time' => $dt->format('H:i'),
                        'order_timezone' => $chefTimezone,
                        'order_timestamp' => $timestamp,
                    ]);
                }
            });
    }

    public function down()
    {
        Orders::whereNotNull('order_date_new')->update([
            'order_date_new' => null,
            'order_time' => null,
            'order_timezone' => null,
            'order_timestamp' => null,
        ]);
    }
};
