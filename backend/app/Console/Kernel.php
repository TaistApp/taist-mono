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
        // Process expired orders every 30 minutes
        // Checks for orders that exceeded 30-minute acceptance deadline and issues automatic refunds
        $schedule->command('orders:process-expired')
                 ->everyThirtyMinutes()
                 ->withoutOverlapping()
                 ->runInBackground();

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
                 ->runInBackground();

        // TMA-011 REVISED: Clean up old availability overrides
        // Removes override records older than 7 days to keep database clean
        $schedule->command('chef:cleanup-old-overrides')
                 ->daily()
                 ->at('02:00')
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
