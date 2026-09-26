<?php

namespace App\Console\Commands;

use App\Services\MetaAdSetup;
use App\Services\MetaAdsClient;
use Illuminate\Console\Command;

/**
 * Read-only check of the Meta connection: token, permissions, ad account,
 * Page, Instagram and service-area ZIPs. Changes nothing.
 */
class AdsMetaCheck extends Command
{
    protected $signature = 'ads:meta-check';

    protected $description = 'Check what the Meta system user token can reach (read-only)';

    public function handle(MetaAdsClient $meta, MetaAdSetup $setup)
    {
        if (!$meta->canReachAccount()) {
            $this->error('Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID in Railway first.');
            return 1;
        }

        $failed = 0;
        foreach ($setup->check() as [$label, $ok, $detail]) {
            $this->line(($ok ? '<info>OK</info>   ' : '<error>FAIL</error> ') . str_pad($label, 18) . $detail);
            $failed += $ok ? 0 : 1;
        }

        $this->line('');
        $this->line($meta->configured()
            ? 'META_ADSET_ID is set: the weekly automation can publish.'
            : 'Not publishing yet: missing ' . implode(', ', $meta->missingConfig()) . '. Run ads:meta-setup to create the ad set.');

        return $failed ? 1 : 0;
    }
}
