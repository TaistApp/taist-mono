<?php

namespace App\Console\Commands;

use App\Services\NewsletterService;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Drives the newsletter pipeline. Scheduled every 15 minutes:
 *
 *   1. Plan: auto-draft the next regular edition per audience from its backlog.
 *   2. Preview: email Dayne each scheduled edition 48 hours before it sends.
 *   3. Send: deliver editions whose time has come (and whose preview went out
 *      at least 48 hours earlier), resuming any send that was interrupted.
 */
class RunNewsletters extends Command
{
    protected $signature = 'newsletter:run
        {--dry-run : Report what would be planned, previewed and sent without changing or sending anything}
        {--force : Run even when NEWSLETTER_AUTOSEND is off (e.g. on staging)}';

    protected $description = 'Auto-draft, preview (48h ahead) and send scheduled chef/customer newsletters';

    public function handle(NewsletterService $newsletters)
    {
        $dryRun = (bool) $this->option('dry-run');

        if (!$newsletters->autosendEnabled() && !$dryRun && !$this->option('force')) {
            $this->line('newsletter:run skipped: NEWSLETTER_AUTOSEND is off in this environment.');
            return 0;
        }

        $now = Carbon::now();
        $prefix = $dryRun ? '[dry run] ' : '';

        foreach ($newsletters->planNextEditions($now, $dryRun) as $edition) {
            $this->info($prefix . 'Planned ' . $edition->displayName() . ' (' . $edition->status . ') for '
                . ($edition->send_at ? $edition->send_at->toDateTimeString() . ' UTC' : 'no date'));
        }

        $previews = $newsletters->sendDuePreviews($now, $dryRun);
        if ($previews > 0) {
            $this->info($prefix . "Sent {$previews} preview(s) to " . $newsletters->previewEmail());
        }

        foreach ($newsletters->sendDueEditions($now, $dryRun) as $edition) {
            $this->info($dryRun
                ? "[dry run] Would send {$edition->displayName()} to " . $newsletters->recipients($edition->user_type)->count() . ' recipient(s)'
                : "Sent {$edition->displayName()}: {$edition->sent_count}/{$edition->recipient_count} delivered, {$edition->failed_count} failed");
        }

        return 0;
    }
}
