<?php

namespace App\Console\Commands;

use App\Services\AdService;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Drives the paid-ads pipeline. Scheduled every 15 minutes:
 *
 *   1. Approve: at go-live, mark the batch ready and email the copy to launch.
 *   2. End: close batches past their run length with a turn-off reminder.
 *   3. Plan: auto-draft the next weekly batch from the ad backlog (right after
 *      an approval, so the next batch is on the calendar a week ahead).
 *   4. Preview: email Dayne each scheduled batch 48 hours before it goes live.
 */
class RunAds extends Command
{
    protected $signature = 'ads:run
        {--dry-run : Report what would be planned, previewed, approved and ended without changing or sending anything}
        {--force : Run even when ADS_AUTOMATION is off (e.g. on staging)}';

    protected $description = 'Auto-draft, preview (48h ahead) and approve weekly Instagram/Facebook ad batches';

    public function handle(AdService $ads)
    {
        $dryRun = (bool) $this->option('dry-run');

        if (!$ads->automationEnabled() && !$dryRun && !$this->option('force')) {
            $this->line('ads:run skipped: ADS_AUTOMATION is off in this environment.');
            return 0;
        }

        $now = Carbon::now();
        $prefix = $dryRun ? '[dry run] ' : '';

        foreach ($ads->approveDueBatches($now, $dryRun) as $batch) {
            $this->info($prefix . 'Approved ' . $batch->displayName() . ' (ready to launch)');
        }

        foreach ($ads->endExpiredBatches($now, $dryRun) as $batch) {
            $this->info($prefix . 'Ended ' . $batch->displayName());
        }

        if ($batch = $ads->planNextBatch($now, $dryRun)) {
            $this->info($prefix . 'Planned ' . $batch->displayName() . ' (' . $batch->status . ') for '
                . ($batch->go_live_at ? $batch->go_live_at->toDateTimeString() . ' UTC' : 'no date'));
        }

        $previews = $ads->sendDuePreviews($now, $dryRun);
        if ($previews > 0) {
            $this->info($prefix . "Sent {$previews} ads preview(s) to " . $ads->previewEmail());
        }

        return 0;
    }
}
