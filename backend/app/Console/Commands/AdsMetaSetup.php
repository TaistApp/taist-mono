<?php

namespace App\Console\Commands;

use App\Services\MetaAdSetup;
use App\Services\MetaAdsClient;
use Illuminate\Console\Command;

/**
 * One-time creation of the paused customer campaign + ad set with the
 * approved targeting, the $95 account spending limit and the automation
 * settings. Shows the plan only, unless --apply is passed. Safe to re-run:
 * an existing campaign/ad set with the same name is reused.
 */
class AdsMetaSetup extends Command
{
    protected $signature = 'ads:meta-setup {--apply : Create the campaign and ad set (otherwise only shows the plan)}';

    protected $description = 'Create the paused Meta campaign and ad set for customer ads (one-time)';

    public function handle(MetaAdsClient $meta, MetaAdSetup $setup)
    {
        if (!$meta->canReachAccount()) {
            $this->error('Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID in Railway first.');
            return 1;
        }

        try {
            $plan = $setup->plan();
        } catch (\Throwable $e) {
            $this->error($e->getMessage());
            return 1;
        }

        $this->info('Campaign: ' . $plan['campaign']['name'] . ' (Traffic, PAUSED, no special ad category)');
        $this->info('Ad set:   ' . $plan['adset']['name'] . ' (PAUSED)');
        $this->line('  Budget:      $' . number_format($plan['adset']['daily_budget'] / 100, 2) . '/day, lowest cost, optimised for landing page views');
        $this->line('  Location:    people living in ' . implode(', ', $plan['zips']));
        $this->line('  Age:         ' . MetaAdSetup::AGE_MIN . '-' . MetaAdSetup::AGE_MAX . ', all genders, Advantage+ audience');
        $this->line('  Interests:   ' . ($plan['interests'] ? implode(', ', $plan['interests']) : '(none found)') . ' (suggestions)');
        $this->line('  Language:    ' . ($plan['locale'] ?? '(no English locale found, not restricted)'));
        $this->line('  Placements:  Facebook + Instagram feeds, Instagram Explore, Stories, Reels');
        $this->line('Spending limit: $' . $plan['spend_cap_dollars'] . ' on the ad account');
        $this->line('Automation:     ' . $plan['automation']['ads_per_batch'] . ' ad per batch, new batch every '
            . $plan['automation']['cadence_days'] . ' days, each runs ' . $plan['automation']['run_days'] . ' days');

        if (!$this->option('apply')) {
            $this->line('');
            $this->line('Plan only. Run again with --apply to create it.');
            return 0;
        }

        try {
            $result = $setup->apply($plan);
        } catch (\Throwable $e) {
            $this->error('Setup failed: ' . $e->getMessage());
            return 1;
        }

        $this->line('');
        $this->info('Done. Nothing is spending: the campaign and ad set are paused, and ads only switch on at a batch go-live.');
        $this->line('Campaign ID:    ' . $result['campaign_id']);
        $this->line('Spending limit: ' . ($result['spend_cap'] !== null ? '$' . number_format($result['spend_cap'], 2) : 'could not read back, check Billing'));
        $this->line('');
        $this->line('Add this in Railway:  META_ADSET_ID=' . $result['adset_id']);

        return 0;
    }
}
