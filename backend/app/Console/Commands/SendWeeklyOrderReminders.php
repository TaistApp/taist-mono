<?php

namespace App\Console\Commands;

use App\Services\WeeklyOrderReminderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendWeeklyOrderReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reminders:send-weekly-order {--dry-run : Evaluate eligibility without sending push notifications}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send weekly customer order reminder push notifications (Mon-Thu, local-time window, capped)';

    protected $weeklyOrderReminderService;

    public function __construct(WeeklyOrderReminderService $weeklyOrderReminderService)
    {
        parent::__construct();
        $this->weeklyOrderReminderService = $weeklyOrderReminderService;
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $dryRun = (bool) $this->option('dry-run');
        $mode = $dryRun ? 'DRY RUN' : 'LIVE';
        $this->info("Starting weekly order reminders ({$mode})...");

        $stats = $this->weeklyOrderReminderService->sendWeeklyReminders($dryRun);

        $this->table(
            ['Metric', 'Count'],
            [
                ['scanned', $stats['scanned']],
                ['eligible_window', $stats['eligible_window']],
                ['sent', $stats['sent']],
                ['skipped_disabled', $stats['skipped_disabled']],
                ['skipped_missing_token', $stats['skipped_missing_token']],
                ['skipped_window', $stats['skipped_window']],
                ['skipped_slot', $stats['skipped_slot']],
                ['skipped_cap', $stats['skipped_cap']],
                ['skipped_duplicate_slot', $stats['skipped_duplicate_slot']],
                ['errors', $stats['errors']],
            ]
        );

        Log::info('Weekly order reminders run completed', array_merge(
            ['dry_run' => $dryRun],
            $stats
        ));

        return 0;
    }
}
