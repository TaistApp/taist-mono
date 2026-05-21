<?php

namespace App\Console\Commands;

use App\Services\WeeklyNudgeService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendWeeklyNudges extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'nudge:send-weekly {--dry-run : Evaluate eligibility without sending push notifications}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send weekly nudge push notifications to customers (Mon-Thu, local-time window, capped)';

    protected $weeklyNudgeService;

    public function __construct(WeeklyNudgeService $weeklyNudgeService)
    {
        parent::__construct();
        $this->weeklyNudgeService = $weeklyNudgeService;
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
        $this->info("Starting weekly nudges ({$mode})...");

        $stats = $this->weeklyNudgeService->sendWeeklyNudges($dryRun);

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

        Log::info('Weekly nudges run completed', array_merge(
            ['dry_run' => $dryRun],
            $stats
        ));

        return 0;
    }
}
