<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * The Artisan commands provided by your application.
     *
     * @var array
     */
    protected $commands = [
        //
    ];

    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // Process expired orders every 5 minutes
        // Checks for orders that exceeded the 30-minute acceptance deadline,
        // issues automatic refunds, and notifies the customer. Runs on a
        // 5-minute cadence so the expiry push lands promptly after the
        // window closes.
        $schedule->command('orders:process-expired')
                 ->everyFiveMinutes()
                 ->withoutOverlapping()
                 ->runInBackground();

        // Remind chefs about pending order requests every 5 minutes
        // Pushes a reminder to the chef every 5 minutes of the 30-minute
        // acceptance window until they accept or decline.
        $schedule->command('orders:send-acceptance-reminders')
                 ->everyFiveMinutes()
                 ->withoutOverlapping()
                 ->runInBackground()
                 ->appendOutputTo('/proc/1/fd/1');

        // Send 24-hour order reminders every 30 minutes
        // Sends SMS reminders to both chef and customer for orders happening tomorrow
        $schedule->command('orders:send-reminders')
                 ->everyThirtyMinutes()
                 ->withoutOverlapping()
                 ->runInBackground();

        // TMA-011 REVISED: Send chef availability confirmation reminders
        // Sends 24-hour reminders to chefs to confirm/modify/cancel tomorrow's scheduled hours
        $schedule->command('chef:send-confirmation-reminders')
                 ->everyFifteenMinutes()
                 ->withoutOverlapping()
                 ->appendOutputTo('/proc/1/fd/1');

        // TMA-011 REVISED: Clean up old availability overrides
        // Removes override records older than 7 days to keep database clean
        $schedule->command('chef:cleanup-old-overrides')
                 ->daily()
                 ->at('02:00')
                 ->withoutOverlapping();

        // TMA-063: Weekly nudge push notifications
        // Runs every 15 minutes, sends in local Mon-Thu 10:00-16:00 windows, max 2/week per customer.
        $schedule->command('nudge:send-weekly')
                 ->everyFifteenMinutes()
                 ->withoutOverlapping()
                 ->runInBackground()
                 ->appendOutputTo('/proc/1/fd/1');

        // Safety net: clean up stale verification accounts older than 2 hours.
        // Won't touch accounts from an active session (created < 2h ago).
        $schedule->command('verify:accounts cleanup --max-age=120')
                 ->daily()
                 ->at('03:00')
                 ->withoutOverlapping();
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
