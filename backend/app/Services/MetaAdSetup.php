<?php

namespace App\Services;

use App\Models\AdSettings;

/**
 * One-time Meta setup for the paid ads pipeline: checks what the system user
 * token can reach, and creates the (paused) customer campaign and ad set with
 * the targeting Dayne approved on 2026-09-26. Used by `ads:meta-check` and
 * `ads:meta-setup`; the weekly automation itself never creates campaigns,
 * ad sets or budgets.
 */
class MetaAdSetup
{
    const CAMPAIGN_NAME = 'Taist Customers (automated)';
    const ADSET_NAME = 'Taist Customers - service areas';

    // Approved 2026-09-26: $3/day, $95 account spending limit (just under $100/month).
    const DAILY_BUDGET_CENTS = 300;
    const SPEND_CAP_DOLLARS = 95;

    // Approved automation settings: 1 ad per weekly batch, each running 14 days,
    // so two ads always overlap.
    const AUTOMATION = ['ads_per_batch' => 1, 'cadence_days' => 7, 'run_days' => 14];

    const AGE_MIN = 25;
    const AGE_MAX = 64;

    // Suggested interests for Advantage+ audience (looked up by name at setup time).
    const INTEREST_TERMS = ['Cooking', 'Restaurants', 'Meal kit', 'Date night', 'Entertaining'];

    private $meta;
    private $newsletters;

    public function __construct(MetaAdsClient $meta, NewsletterService $newsletters)
    {
        $this->meta = $meta;
        $this->newsletters = $newsletters;
    }

    /**
     * What the token can see, for `ads:meta-check`. Each entry is
     * [label, ok (bool), detail]. Read-only.
     */
    public function check(): array
    {
        $rows = [];
        $probe = function (string $label, callable $fn) use (&$rows) {
            try {
                $rows[] = [$label, true, $fn()];
            } catch (\Throwable $e) {
                $rows[] = [$label, false, $e->getMessage()];
            }
        };

        $probe('Token', function () {
            $me = $this->meta->get('me', ['fields' => 'id,name']);
            return ($me['name'] ?? 'unknown') . ' (' . ($me['id'] ?? '?') . ')';
        });
        $probe('Permissions', function () {
            $granted = collect($this->meta->get('me/permissions')['data'] ?? [])
                ->where('status', 'granted')->pluck('permission')->all();
            $needed = ['ads_management', 'ads_read', 'business_management', 'pages_read_engagement',
                'pages_show_list', 'instagram_basic', 'instagram_manage_insights'];
            $missing = array_values(array_diff($needed, $granted));
            if ($missing) {
                throw new \RuntimeException('missing ' . implode(', ', $missing));
            }
            return 'all needed permissions granted';
        });
        $probe('Ad account', function () {
            $a = $this->meta->get($this->meta->account(), [
                'fields' => 'name,currency,timezone_name,account_status,spend_cap,amount_spent,funding_source_details',
            ]);
            $status = [1 => 'active', 2 => 'disabled', 3 => 'unsettled', 7 => 'pending review', 9 => 'in grace period', 101 => 'closed'];
            if (($a['currency'] ?? '') !== 'USD' || ($a['timezone_name'] ?? '') !== 'America/New_York') {
                throw new \RuntimeException("{$a['name']}: currency/time zone is {$a['currency']} / {$a['timezone_name']}, expected USD / America/New_York");
            }
            return sprintf('%s: %s, %s, %s, spend limit %s, spent $%s, payment method %s',
                $a['name'] ?? '?', $a['currency'], $a['timezone_name'],
                $status[$a['account_status'] ?? 0] ?? 'status ' . ($a['account_status'] ?? '?'),
                !empty($a['spend_cap']) ? '$' . number_format($a['spend_cap'] / 100, 2) : 'none',
                number_format(($a['amount_spent'] ?? 0) / 100, 2),
                !empty($a['funding_source_details']) ? 'on file' : 'NOT FOUND');
        });
        $probe('Facebook Page', function () {
            $p = $this->meta->get((string) config('app.meta_page_id'), ['fields' => 'name']);
            return $p['name'] ?? '?';
        });
        $probe('Instagram', function () {
            $ig = $this->meta->get((string) config('app.meta_instagram_user_id'), ['fields' => 'username']);
            return '@' . ($ig['username'] ?? '?');
        });
        $probe('Service-area ZIPs', function () {
            $zips = $this->newsletters->serviceAreaZips();
            if (!$zips) {
                throw new \RuntimeException('none set in Admin > Service Areas');
            }
            return count($zips) . ': ' . implode(', ', $zips);
        });

        return $rows;
    }

    /**
     * Everything setup would create, resolved against Meta (interest and
     * locale IDs are looked up by name). Read-only.
     */
    public function plan(): array
    {
        $zips = $this->newsletters->serviceAreaZips();
        if (!$zips) {
            throw new \RuntimeException('No service-area ZIP codes are set (Admin > Service Areas).');
        }

        $interests = [];
        foreach (self::INTEREST_TERMS as $term) {
            $match = collect($this->meta->get('search', ['type' => 'adinterest', 'q' => $term, 'limit' => 5])['data'] ?? [])
                ->first();
            if ($match) {
                $interests[] = ['id' => (string) $match['id'], 'name' => $match['name']];
            }
        }

        $english = collect($this->meta->get('search', ['type' => 'adlocale', 'q' => 'English'])['data'] ?? [])
            ->first(function ($l) {
                return stripos($l['name'] ?? '', 'All') !== false;
            });

        $targeting = array_filter([
            'geo_locations' => [
                'zips' => array_map(function ($zip) {
                    return ['key' => 'US:' . $zip];
                }, $zips),
                'location_types' => ['home'],
            ],
            'age_min' => self::AGE_MIN,
            'age_max' => self::AGE_MAX,
            'locales' => $english ? [(int) $english['key']] : null,
            'flexible_spec' => $interests ? [['interests' => $interests]] : null,
            'targeting_automation' => ['advantage_audience' => 1],
            'publisher_platforms' => ['facebook', 'instagram'],
            'facebook_positions' => ['feed', 'story', 'facebook_reels'],
            'instagram_positions' => ['stream', 'explore', 'story', 'reels'],
            'device_platforms' => ['mobile', 'desktop'],
        ]);

        return [
            'campaign' => [
                'name' => self::CAMPAIGN_NAME,
                'objective' => 'OUTCOME_TRAFFIC',
                'status' => 'PAUSED',
                'special_ad_categories' => [],
            ],
            'adset' => [
                'name' => self::ADSET_NAME,
                'daily_budget' => self::DAILY_BUDGET_CENTS,
                'billing_event' => 'IMPRESSIONS',
                'optimization_goal' => 'LANDING_PAGE_VIEWS',
                'bid_strategy' => 'LOWEST_COST_WITHOUT_CAP',
                'destination_type' => 'WEBSITE',
                'status' => 'PAUSED',
                'targeting' => $targeting,
            ],
            'spend_cap_dollars' => self::SPEND_CAP_DOLLARS,
            'automation' => self::AUTOMATION,
            'zips' => $zips,
            'interests' => array_column($interests, 'name'),
            'locale' => $english['name'] ?? null,
        ];
    }

    /**
     * Create the campaign and ad set (both PAUSED), set the account spending
     * limit and the automation settings. Reuses a campaign/ad set with the
     * same name if a previous run created one.
     *
     * @return array ['campaign_id', 'adset_id', 'spend_cap' (read back, dollars)]
     */
    public function apply(array $plan): array
    {
        $account = $this->meta->account();

        $campaignId = $this->findByName($account . '/campaigns', self::CAMPAIGN_NAME);
        if (!$campaignId) {
            $campaignId = $this->meta->post($account . '/campaigns', [
                'name' => $plan['campaign']['name'],
                'objective' => $plan['campaign']['objective'],
                'status' => 'PAUSED',
                'special_ad_categories' => json_encode([]),
                'is_adset_budget_sharing_enabled' => 'false',
            ])['id'];
        }

        $adsetId = $this->findByName($account . '/adsets', self::ADSET_NAME);
        if (!$adsetId) {
            $adset = $plan['adset'];
            $adsetId = $this->meta->post($account . '/adsets', [
                'name' => $adset['name'],
                'campaign_id' => $campaignId,
                'daily_budget' => $adset['daily_budget'],
                'billing_event' => $adset['billing_event'],
                'optimization_goal' => $adset['optimization_goal'],
                'bid_strategy' => $adset['bid_strategy'],
                'destination_type' => $adset['destination_type'],
                'status' => 'PAUSED',
                'targeting' => json_encode($adset['targeting']),
            ])['id'];
        }

        $this->meta->post($account, ['spend_cap' => $plan['spend_cap_dollars']]);
        $readBack = $this->meta->get($account, ['fields' => 'spend_cap'])['spend_cap'] ?? null;

        $row = AdSettings::query()->orderBy('id')->first() ?: new AdSettings(AdSettings::DEFAULTS);
        $row->fill($plan['automation'])->save();

        return [
            'campaign_id' => (string) $campaignId,
            'adset_id' => (string) $adsetId,
            'spend_cap' => $readBack !== null ? $readBack / 100 : null,
        ];
    }

    private function findByName(string $edge, string $name): ?string
    {
        $items = $this->meta->get($edge, ['fields' => 'id,name,effective_status', 'limit' => 100])['data'] ?? [];
        foreach ($items as $item) {
            if (($item['name'] ?? '') === $name && ($item['effective_status'] ?? '') !== 'DELETED') {
                return (string) $item['id'];
            }
        }
        return null;
    }
}
