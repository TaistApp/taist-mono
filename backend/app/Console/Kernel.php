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

        // Walk chefs through active orders: "On My Way" nudge 30 min before
        // arrival, and a "mark complete + dish photo" nudge once the menu
        // item's estimated cook time has elapsed.
        $schedule->command('orders:send-progression-reminders')
                 ->everyFiveMinutes()
                 ->withoutOverlapping()
                 ->runInBackground()
                 ->appendOutputTo('/proc/1/fd/1');

        // Expire unclaimed dish pool requests and tell the customer.
        $schedule->command('pool:expire-requests')
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

        // Nudge approved chefs who never set weekly availability — the last
        // onboarding step, and the only one with no reminder of its own.
        // Hourly is granular enough: the command self-limits to 10:00-18:00
        // chef-local, one reminder per 72h, four per chef for life.
        //
        // --sms because push alone does not reach this cohort: no chef account
        // in production has push_opted_in set, and getToken() returns a valid
        // token without notification permission, so a push-only reminder can
        // report success, never display, and still spend one of the four. The
        // lifetime cap bounds this at four texts per chef; TwilioService's own
        // SMS_ENABLED gate keeps it to production.
        $schedule->command('chef:send-availability-reminders --sms')
                 ->hourly()
                 ->withoutOverlapping()
                 ->runInBackground()
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

        // Daily canary for the Google Geocoding API. Geocoding failures are
        // silent by design (users just see "Location not available"), so
        // without this a dead key, lapsed GCP billing, or a tripped quota can
        // run for months unnoticed — as it did in June 2026. Emails
        // contact@taist.app on failure. 13:00 UTC = morning ET.
        $schedule->command('geocode:health')
                 ->daily()
                 ->at('13:00')
                 ->withoutOverlapping()
                 ->appendOutputTo('/proc/1/fd/1');
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
