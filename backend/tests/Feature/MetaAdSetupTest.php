<?php

namespace Tests\Feature;

use App\Models\AdSettings;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The one-time Meta setup commands: ads:meta-check (read-only) and
 * ads:meta-setup (plan by default, creates the paused campaign + ad set
 * with the approved targeting only with --apply).
 */
class MetaAdSetupTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.meta_access_token' => 'meta_test_token',
            'app.meta_ad_account_id' => '1498725312091866',
            'app.meta_adset_id' => null,
            'app.meta_page_id' => '111916651258217',
            'app.meta_instagram_user_id' => '17841448434123490',
            'app.meta_graph_version' => 'v23.0',
        ]);

        foreach (['tbl_zipcodes', 'tbl_ad_batches', 'tbl_ads', 'tbl_ad_backlog', 'tbl_ad_settings'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::create('tbl_zipcodes', function (Blueprint $table) {
            $table->increments('id');
            $table->text('zipcodes')->nullable();
        });
        DB::table('tbl_zipcodes')->insert(['zipcodes' => '46038, 46032,46256']);

        require_once database_path('migrations/2026_09_26_000001_create_ads_tables.php');
        (new \CreateAdsTables)->up();

        Http::fake(function (HttpRequest $request) {
            $path = parse_url($request->url(), PHP_URL_PATH);
            if ($request->method() === 'POST') {
                if (str_ends_with($path, '/campaigns')) {
                    return Http::response(['id' => 'camp_1']);
                }
                if (str_ends_with($path, '/adsets')) {
                    return Http::response(['id' => 'adset_1']);
                }
                return Http::response(['success' => true]);
            }
            if (str_ends_with($path, '/search')) {
                return strpos($request->url(), 'adlocale') !== false
                    ? Http::response(['data' => [['key' => 6, 'name' => 'English (US)'], ['key' => 1001, 'name' => 'English (All)']]])
                    : Http::response(['data' => [['id' => '600' . strlen($request->url()), 'name' => 'Interest ' . strlen($request->url())]]]);
            }
            if (str_ends_with($path, '/me/permissions')) {
                return Http::response(['data' => array_map(function ($p) {
                    return ['permission' => $p, 'status' => 'granted'];
                }, ['ads_management', 'ads_read', 'business_management', 'pages_read_engagement', 'pages_show_list', 'instagram_basic', 'instagram_manage_insights'])]);
            }
            if (str_ends_with($path, '/me')) {
                return Http::response(['id' => '99', 'name' => 'TaistPaid']);
            }
            if (str_ends_with($path, '/campaigns') || str_ends_with($path, '/adsets')) {
                return Http::response(['data' => []]);
            }
            if (str_ends_with($path, '/act_1498725312091866')) {
                return Http::response([
                    'name' => 'Taist Ads', 'currency' => 'USD', 'timezone_name' => 'America/New_York',
                    'account_status' => 1, 'spend_cap' => '9500', 'amount_spent' => '0', 'funding_source_details' => ['id' => '1'],
                ]);
            }
            if (str_ends_with($path, '/111916651258217')) {
                return Http::response(['name' => 'Taist']);
            }
            if (str_ends_with($path, '/17841448434123490')) {
                return Http::response(['username' => 'taist.team']);
            }
            return Http::response([], 404);
        });
    }

    public function test_check_reports_everything_and_changes_nothing()
    {
        [$exit, $out] = $this->runCommand('ads:meta-check');

        $this->assertSame(0, $exit, $out);
        foreach (['TaistPaid', 'Taist Ads: USD, America/New_York, active, spend limit $95.00', '@taist.team',
            '3: 46038, 46032, 46256', 'missing META_ADSET_ID'] as $expected) {
            $this->assertStringContainsString($expected, $out);
        }

        $this->assertCount(0, Http::recorded(function ($r) {
            return $r->method() === 'POST';
        }));
    }

    public function test_setup_without_apply_only_shows_the_plan()
    {
        [$exit, $out] = $this->runCommand('ads:meta-setup');

        $this->assertSame(0, $exit, $out);
        foreach (['$3.00/day', 'people living in 46038, 46032, 46256', 'Spending limit: $95', 'Plan only'] as $expected) {
            $this->assertStringContainsString($expected, $out);
        }

        $this->assertCount(0, Http::recorded(function ($r) {
            return $r->method() === 'POST';
        }));
    }

    public function test_setup_apply_creates_paused_campaign_and_adset_with_approved_targeting()
    {
        [$exit, $out] = $this->runCommand('ads:meta-setup', ['--apply' => true]);

        $this->assertSame(0, $exit, $out);
        $this->assertStringContainsString('META_ADSET_ID=adset_1', $out);

        Http::assertSent(function (HttpRequest $r) {
            return $r->method() === 'POST'
                && str_ends_with(parse_url($r->url(), PHP_URL_PATH), '/act_1498725312091866/campaigns')
                && $r['objective'] === 'OUTCOME_TRAFFIC' && $r['status'] === 'PAUSED' && $r['special_ad_categories'] === '[]';
        });
        Http::assertSent(function (HttpRequest $r) {
            if (!str_ends_with(parse_url($r->url(), PHP_URL_PATH), '/adsets') || $r->method() !== 'POST') {
                return false;
            }
            $t = json_decode($r['targeting'], true);
            return $r['status'] === 'PAUSED'
                && (int) $r['daily_budget'] === 300
                && $r['optimization_goal'] === 'LANDING_PAGE_VIEWS'
                && $r['campaign_id'] === 'camp_1'
                && $t['geo_locations']['zips'] === [['key' => 'US:46038'], ['key' => 'US:46032'], ['key' => 'US:46256']]
                && $t['geo_locations']['location_types'] === ['home']
                && $t['age_min'] === 25 && $t['age_max'] === 64
                && $t['locales'] === [1001]
                && $t['targeting_automation'] === ['advantage_audience' => 1]
                && count($t['flexible_spec'][0]['interests']) === 5
                && $t['publisher_platforms'] === ['facebook', 'instagram'];
        });
        Http::assertSent(function (HttpRequest $r) {
            return $r->method() === 'POST' && str_ends_with(parse_url($r->url(), PHP_URL_PATH), '/act_1498725312091866')
                && (string) $r['spend_cap'] === '95';
        });

        $settings = AdSettings::current();
        $this->assertSame(1, $settings['ads_per_batch']);
        $this->assertSame(7, $settings['cadence_days']);
        $this->assertSame(14, $settings['run_days']);
    }

    public function test_commands_refuse_without_token()
    {
        config(['app.meta_access_token' => null]);

        $this->assertSame(1, $this->runCommand('ads:meta-check')[0]);
        $this->assertSame(1, $this->runCommand('ads:meta-setup', ['--apply' => true])[0]);
        Http::assertNothingSent();
    }

    private function runCommand(string $command, array $args = []): array
    {
        $exit = Artisan::call($command, $args);
        return [$exit, Artisan::output()];
    }
}
