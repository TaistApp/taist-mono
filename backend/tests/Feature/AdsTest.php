<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\AdBacklogItem;
use App\Models\AdBatch;
use App\Models\AdSettings;
use App\Models\Admins;
use App\Services\AdService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The paid-ads pipeline: weekly batches drafted from the idea backlog (or
 * recycled organic posts), created paused in Meta with the 48-hour preview,
 * switched on at go-live and paused at the end. Resend and the Meta Graph API
 * are faked with Http::fake, so every assertion about Meta is an assertion
 * about the exact request that would have gone out.
 */
class AdsTest extends TestCase
{
    private const NOW = '2026-10-01 14:00:00';

    /** @var array fake Meta behaviour, see fakeApis() */
    private $meta = [];
    private $metaIds = 0;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse(self::NOW, 'UTC'));
        $this->app['env'] = 'production';
        config([
            'app.key' => 'base64:' . base64_encode(str_repeat('k', 32)),
            'app.url' => 'https://api.taist.app',
            'app.ads_automation' => true,
            'app.ads_preview_email' => 'dayne@taist.app',
            'app.meta_access_token' => 'meta_test_token',
            'app.meta_ad_account_id' => '1234',
            'app.meta_adset_id' => '5555',
            'app.meta_page_id' => '111916651258217',
            'app.meta_instagram_user_id' => '17841448434123490',
            'app.meta_graph_version' => 'v23.0',
        ]);
        $this->setResendKey('re_test_key');

        foreach (['tbl_ad_batches', 'tbl_ads', 'tbl_ad_backlog', 'tbl_ad_settings', 'tbl_dish_photos', 'tbl_discount_codes', 'social_posted_receipts'] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::create('tbl_dish_photos', function (Blueprint $table) {
            $table->id();
            $table->string('filename');
            $table->string('status')->default('pending');
            $table->boolean('queued_for_social')->default(false);
            $table->timestamps();
        });

        require_once database_path('migrations/2026_09_26_000001_create_ads_tables.php');
        (new \CreateAdsTables)->up();

        $this->fakeApis();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        $this->setResendKey(null);
        parent::tearDown();
    }

    public function test_migration_seeds_backlog_only_and_nothing_runs()
    {
        $this->assertSame(5, AdBacklogItem::count());
        $this->assertSame(0, AdBatch::count());

        // Seeded copy follows the content rules.
        $ads = app(AdService::class);
        foreach (AdBacklogItem::all() as $item) {
            $warnings = $ads->adWarnings($ads->adFromBacklog($item));
            $this->assertSame([], array_values(array_filter($warnings, function ($w) {
                return strpos($w, 'No image') !== 0 && strpos($w, 'Discount code') !== 0;
            })), $item->angle);
        }

        $this->artisan('ads:run')->assertExitCode(0);

        Http::assertNothingSent();
        $this->assertSame(0, AdBatch::count());
    }

    public function test_command_is_inert_when_automation_is_off()
    {
        config(['app.ads_automation' => false]);
        $this->scheduledBatch(['go_live_at' => Carbon::now()->addHours(10)]);

        $this->artisan('ads:run')->assertExitCode(0);

        Http::assertNothingSent();
    }

    public function test_preview_creates_paused_ads_in_meta_and_emails_dayne()
    {
        $batch = $this->scheduledBatch(['go_live_at' => Carbon::now()->addHours(47)]);
        $later = $this->scheduledBatch(['go_live_at' => Carbon::now()->addHours(60)]);

        $this->artisan('ads:run')->assertExitCode(0);

        Http::assertSent(function (HttpRequest $r) {
            return strpos($r->url(), 'graph.facebook.com/v23.0/act_1234/adcreatives') !== false
                && strpos($r['object_story_spec'], '"instagram_user_id":"17841448434123490"') !== false
                && strpos($r['object_story_spec'], 'Dinner, handled.') !== false;
        });
        Http::assertSent(function (HttpRequest $r) {
            return strpos($r->url(), 'act_1234/ads') !== false && ($r['status'] ?? null) === 'PAUSED' && $r['adset_id'] === '5555';
        });
        $this->assertNotSent(function (HttpRequest $r) {
            return ($r['status'] ?? null) === 'ACTIVE';
        });

        $ad = $batch->fresh('ads')->ads->first();
        $this->assertNotNull($ad->meta_ad_id);
        $this->assertSame('PAUSED', $ad->meta_status);

        Http::assertSent(function (HttpRequest $r) use ($batch) {
            if (strpos($r->url(), 'api.resend.com') === false) {
                return false;
            }
            $message = $r->data()[0];
            return $message['to'] === ['dayne@taist.app']
                && strpos($message['subject'], '[Ads preview') === 0
                && strpos($message['html'], '/ads/pause/' . $batch->id . '?t=') !== false
                && strpos($message['html'], 'switch on automatically') !== false;
        });
        $this->assertNotNull($batch->fresh()->preview_sent_at);
        $this->assertNull($later->fresh()->preview_sent_at);
        $this->assertNull($later->fresh('ads')->ads->first()->meta_ad_id);
    }

    public function test_preview_flags_meta_not_connected()
    {
        config(['app.meta_ad_account_id' => null]);
        $this->scheduledBatch(['go_live_at' => Carbon::now()->addHours(47)]);

        $this->artisan('ads:run')->assertExitCode(0);

        $this->assertNotSent(function (HttpRequest $r) {
            return strpos($r->url(), 'graph.facebook.com') !== false;
        });
        Http::assertSent(function (HttpRequest $r) {
            return strpos($r->url(), 'api.resend.com') !== false
                && strpos($r->data()[0]['html'], 'Meta is not connected (missing META_AD_ACCOUNT_ID)') !== false;
        });
    }

    public function test_late_preview_pushes_go_live_back_a_full_window()
    {
        $batch = $this->scheduledBatch([
            'go_live_at' => Carbon::now()->subHour(),
            'preview_sent_at' => Carbon::now()->subHours(10),
        ]);

        $this->artisan('ads:run')->assertExitCode(0);

        $this->assertSame('scheduled', $batch->fresh()->status);
        Http::assertNothingSent();
    }

    public function test_due_batch_goes_live_and_next_batch_is_planned()
    {
        $items = AdBacklogItem::orderBy('sort')->get();
        $batch = $this->uploadedBatch($items->take(2)->all());
        DB::table('tbl_dish_photos')->insert([
            ['filename' => 'a.jpg', 'status' => 'approved', 'queued_for_social' => 1],
            ['filename' => 'b.jpg', 'status' => 'approved', 'queued_for_social' => 1],
            ['filename' => 'c.jpg', 'status' => 'approved', 'queued_for_social' => 1],
            ['filename' => 'rejected.jpg', 'status' => 'rejected', 'queued_for_social' => 1],
            ['filename' => 'private.jpg', 'status' => 'approved', 'queued_for_social' => 0],
        ]);

        $this->artisan('ads:run')->assertExitCode(0);

        $batch->refresh();
        $this->assertSame('live', $batch->status);
        $this->assertSame(Carbon::now()->toDateTimeString(), $batch->launched_at->toDateTimeString());
        $this->assertSame(Carbon::now()->addDays(14)->toDateTimeString(), $batch->ends_at->toDateTimeString());
        foreach ($batch->ads as $ad) {
            Http::assertSent(function (HttpRequest $r) use ($ad) {
                return strpos($r->url(), '/v23.0/' . $ad->meta_ad_id) !== false && ($r['status'] ?? null) === 'ACTIVE';
            });
            $this->assertSame('ACTIVE', $ad->meta_status);
        }
        $this->assertSame(2, AdBacklogItem::where('used_in_batch_id', $batch->id)->count());
        $this->assertEmailSent('Ads live');

        // Next batch: 7 days after this one went live, at 10:00 ET, from the unused ideas.
        $next = AdBatch::where('id', '!=', $batch->id)->first();
        $this->assertSame('scheduled', $next->status);
        $this->assertSame('auto', $next->created_by);
        $this->assertSame('2026-10-08 10:00', $next->go_live_at->copy()->setTimezone('America/New_York')->format('Y-m-d H:i'));
        $this->assertSame($items->slice(2, 3)->pluck('id')->all(), $next->ads->pluck('backlog_id')->all());
        // Each ad got a different approved, social-queued (real) dish photo.
        $this->assertCount(3, array_unique(array_filter($next->ads->pluck('dish_photo_id')->all())));
        $files = $next->ads->pluck('image_url')->map('basename')->all();
        $this->assertNotContains('rejected.jpg', $files);
        $this->assertNotContains('private.jpg', $files);
    }

    public function test_ad_edited_after_preview_is_reuploaded_before_going_live()
    {
        $batch = $this->uploadedBatch();
        $ad = $batch->ads->first();
        $oldMetaId = $ad->meta_ad_id;
        $ad->update(['headline' => 'A brand new headline']);

        $this->artisan('ads:run')->assertExitCode(0);

        $ad->refresh();
        $this->assertNotSame($oldMetaId, $ad->meta_ad_id);
        Http::assertSent(function (HttpRequest $r) use ($oldMetaId) {
            return strpos($r->url(), '/v23.0/' . $oldMetaId) !== false && ($r['status'] ?? null) === 'ARCHIVED';
        });
        Http::assertSent(function (HttpRequest $r) {
            return strpos($r->url(), '/adcreatives') !== false && strpos($r['object_story_spec'], 'A brand new headline') !== false;
        });
        Http::assertSent(function (HttpRequest $r) use ($ad) {
            return strpos($r->url(), '/v23.0/' . $ad->meta_ad_id) !== false && ($r['status'] ?? null) === 'ACTIVE';
        });
        $this->assertSame('live', $batch->fresh()->status);
    }

    public function test_rejected_ad_holds_the_whole_batch()
    {
        $this->meta['review'] = 'DISAPPROVED';
        $batch = $this->uploadedBatch();

        $this->artisan('ads:run')->assertExitCode(0);

        $batch->refresh();
        $this->assertSame('draft', $batch->status);
        $this->assertStringContainsString('Meta rejected it', $batch->notes);
        $this->assertNotSent(function (HttpRequest $r) {
            return ($r['status'] ?? null) === 'ACTIVE';
        });
        $this->assertEmailSent('Ads NOT live');
        // A held batch does not start the next one.
        $this->assertSame(1, AdBatch::count());
    }

    public function test_failed_switch_on_turns_everything_back_off()
    {
        $this->meta['fail_activate_after'] = 1;
        $batch = $this->uploadedBatch(AdBacklogItem::orderBy('sort')->take(2)->get()->all());

        $this->artisan('ads:run')->assertExitCode(0);

        $this->assertSame('draft', $batch->fresh()->status);
        foreach ($batch->ads as $ad) {
            Http::assertSent(function (HttpRequest $r) use ($ad) {
                return strpos($r->url(), '/v23.0/' . $ad->meta_ad_id) !== false && ($r['status'] ?? null) === 'PAUSED';
            });
        }
        $this->assertEmailSent('Ads NOT live');
    }

    public function test_go_live_without_meta_holds_the_batch()
    {
        $batch = $this->uploadedBatch();
        config(['app.meta_access_token' => null]);

        $this->artisan('ads:run')->assertExitCode(0);

        $this->assertSame('draft', $batch->fresh()->status);
        $this->assertStringContainsString('META_ACCESS_TOKEN', $batch->fresh()->notes);
        $this->assertEmailSent('Ads NOT live');
    }

    public function test_empty_backlog_recycles_top_recent_organic_posts()
    {
        AdBacklogItem::query()->update(['used_at' => Carbon::now()->subDay()]);
        $this->liveBatch();
        Schema::create('social_posted_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('kind');
            $table->unsignedBigInteger('source_id');
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();
        });
        // The Content Publisher posted a Menu Item (maybe AI photo) 3 days ago.
        DB::table('social_posted_receipts')->insert([
            'kind' => 'menu-item', 'source_id' => 7, 'posted_at' => Carbon::now()->subDays(3)->addMinutes(2),
        ]);
        Ad::create(['batch_id' => 999, 'source_ig_media_id' => 'already_used']);
        $this->meta['media'] = [
            $this->igPost('menu_item', 3, 50, 9, 'IMAGE'),
            $this->igPost('already_used', 4, 80, 5, 'IMAGE'),
            $this->igPost('newer_tie', 5, 10, 2, 'IMAGE'),
            $this->igPost('reel', 8, 3, 1, 'VIDEO'),
            $this->igPost('older_tie', 12, 11, 1, 'IMAGE'),
            $this->igPost('too_old', 31, 99, 9, 'IMAGE'),
        ];

        $this->artisan('ads:run')->assertExitCode(0);

        $next = AdBatch::where('created_by', 'auto')->first();
        $this->assertSame('scheduled', $next->status);
        $this->assertSame(['newer_tie', 'older_tie', 'reel'], $next->ads->pluck('source_ig_media_id')->all());
        $this->assertStringContainsString('12 likes + comments', $next->ads->first()->angle);
        $this->assertStringContainsString('organic Instagram posts of the last 30 days', $next->notes);

        // When it previews, the recycled post is promoted as-is.
        Carbon::setTestNow($next->go_live_at->copy()->subHours(47));
        $this->artisan('ads:run')->assertExitCode(0);
        Http::assertSent(function (HttpRequest $r) {
            return strpos($r->url(), '/adcreatives') !== false && ($r['source_instagram_media_id'] ?? null) === 'newer_tie';
        });
    }

    public function test_recycling_only_uses_reels_without_the_menu_item_ledger()
    {
        AdBacklogItem::query()->update(['used_at' => Carbon::now()->subDay()]);
        $this->liveBatch();
        $this->meta['media'] = [
            $this->igPost('image', 2, 50, 9, 'IMAGE'),
            $this->igPost('reel', 4, 3, 1, 'VIDEO'),
        ];

        $this->artisan('ads:run')->assertExitCode(0);

        $next = AdBatch::where('created_by', 'auto')->first();
        $this->assertSame(['reel'], $next->ads->pluck('source_ig_media_id')->all());
    }

    public function test_nothing_to_recycle_drafts_and_asks_for_content()
    {
        AdBacklogItem::query()->update(['used_at' => Carbon::now()->subDay()]);
        $this->liveBatch();

        $this->artisan('ads:run')->assertExitCode(0);

        $next = AdBatch::where('created_by', 'auto')->first();
        $this->assertSame('draft', $next->status);
        $this->assertEmailSent('Ads need content');

        // No duplicate drafts on the next run.
        $this->artisan('ads:run')->assertExitCode(0);
        $this->assertSame(2, AdBatch::count());
    }

    public function test_live_batch_is_paused_in_meta_after_run_length()
    {
        AdSettings::create(array_merge(AdSettings::DEFAULTS, ['auto_schedule' => false]));
        $batch = $this->liveBatch(['ends_at' => Carbon::now()->subDay()]);
        $metaId = $batch->ads->first()->meta_ad_id;

        $this->artisan('ads:run')->assertExitCode(0);

        $this->assertSame('ended', $batch->fresh()->status);
        Http::assertSent(function (HttpRequest $r) use ($metaId) {
            return strpos($r->url(), '/v23.0/' . $metaId) !== false && ($r['status'] ?? null) === 'PAUSED';
        });
    }

    public function test_pause_link_returns_batch_to_draft_and_withdraws_it_from_meta()
    {
        $batch = $this->uploadedBatch(null, ['go_live_at' => Carbon::now()->addHours(20)]);
        $metaId = $batch->ads->first()->meta_ad_id;
        $token = app(AdService::class)->pauseToken($batch);

        $this->get("/ads/pause/{$batch->id}?t=bad")->assertStatus(404);
        $this->get("/ads/pause/{$batch->id}?t={$token}")->assertOk()->assertSee('Pause this batch');
        $this->assertSame('scheduled', $batch->fresh()->status);

        $this->post("/ads/pause/{$batch->id}?t={$token}")->assertOk()->assertSee('Paused');
        $this->assertSame('draft', $batch->fresh()->status);
        $this->assertNull($batch->fresh()->preview_sent_at);
        Http::assertSent(function (HttpRequest $r) use ($metaId) {
            return strpos($r->url(), '/v23.0/' . $metaId) !== false && ($r['status'] ?? null) === 'ARCHIVED';
        });
    }

    public function test_content_warnings_follow_taist_rules()
    {
        $ads = app(AdService::class);
        $ad = new Ad([
            'primary_text' => 'Try it free — no parking needed! Better than DoorDash, lowkey. Use code NOPE99.',
            'headline' => str_repeat('x', 45),
            'image_url' => 'http://example.com/a.jpg',
        ]);

        $warnings = implode("\n", $ads->adWarnings($ad));

        $this->assertStringContainsString('dash', $warnings);
        $this->assertStringContainsString('"free"', $warnings);
        $this->assertStringContainsString('parking', $warnings);
        $this->assertStringContainsString('competitor', $warnings);
        $this->assertStringContainsString('lowkey', $warnings);
        $this->assertStringContainsString('Headline is 45', $warnings);
        $this->assertStringContainsString('https://', $warnings);

        $ok = new Ad(['primary_text' => 'Free to download. A chef cooks in your kitchen.', 'headline' => 'Dinner, handled.', 'image_url' => 'https://x.test/a.jpg']);
        $this->assertSame([], $ads->adWarnings($ok));
    }

    public function test_admin_scheduling_requires_48h_notice_and_ads()
    {
        $batch = AdBatch::create(['batch_number' => 1, 'status' => 'draft']);
        $okTime = Carbon::now()->addHours(49)->setTimezone('America/New_York')->format('Y-m-d\TH:i');
        $tooSoon = Carbon::now()->addHours(47)->setTimezone('America/New_York')->format('Y-m-d\TH:i');

        $this->actingAsAdmin()
            ->postJson("/admin-api-v2/ad-batches/{$batch->id}/schedule", ['go_live_at_et' => $okTime])
            ->assertStatus(422)->assertJsonPath('error', 'Add at least one ad first.');

        $this->actingAsAdmin()
            ->putJson("/admin-api-v2/ad-batches/{$batch->id}", ['ads' => [
                ['angle' => 'Test', 'primary_text' => 'Hi', 'headline' => 'Hello', 'cta' => 'ORDER_NOW'],
            ]])
            ->assertOk()->assertJsonPath('batch.ads.0.link_url', 'https://taist.app');

        $this->actingAsAdmin()
            ->postJson("/admin-api-v2/ad-batches/{$batch->id}/schedule", ['go_live_at_et' => $tooSoon])
            ->assertStatus(422);

        $this->actingAsAdmin()
            ->postJson("/admin-api-v2/ad-batches/{$batch->id}/schedule", ['go_live_at_et' => $okTime])
            ->assertOk()->assertJsonPath('batch.status', 'scheduled');

        $this->actingAsAdmin()
            ->putJson("/admin-api-v2/ad-batches/{$batch->id}", ['ads' => [['cta' => 'NOT_A_CTA']]])
            ->assertStatus(422);
    }

    public function test_admin_edits_keep_meta_link_and_withdraw_removed_ads()
    {
        $batch = $this->uploadedBatch(AdBacklogItem::orderBy('sort')->take(2)->get()->all(), ['go_live_at' => Carbon::now()->addHours(20)]);
        [$keep, $drop] = $batch->ads->all();

        $this->actingAsAdmin()
            ->putJson("/admin-api-v2/ad-batches/{$batch->id}", ['ads' => [
                array_merge($keep->only(Ad::CONTENT_FIELDS), ['id' => $keep->id, 'headline' => 'Edited']),
            ]])
            ->assertOk();

        $keep->refresh();
        $this->assertSame('Edited', $keep->headline);
        $this->assertNotNull($keep->meta_ad_id, 'still linked, so go-live re-uploads it');
        $this->assertNull(Ad::find($drop->id));
        Http::assertSent(function (HttpRequest $r) use ($drop) {
            return strpos($r->url(), '/v23.0/' . $drop->meta_ad_id) !== false && ($r['status'] ?? null) === 'ARCHIVED';
        });
    }

    public function test_admin_new_batch_prefills_and_live_batch_can_be_stopped()
    {
        $res = $this->actingAsAdmin()->postJson('/admin-api-v2/ad-batches')->assertOk();
        $this->assertCount(3, $res->json('batch.ads'));

        $live = $this->liveBatch();
        $this->actingAsAdmin()->postJson("/admin-api-v2/ad-batches/{$live->id}/end")
            ->assertOk()->assertJsonPath('batch.status', 'ended');
        Http::assertSent(function (HttpRequest $r) use ($live) {
            return strpos($r->url(), '/v23.0/' . $live->ads->first()->meta_ad_id) !== false && ($r['status'] ?? null) === 'PAUSED';
        });

        $this->actingAsAdmin()->getJson('/admin-api-v2/ad-batches')->assertOk()
            ->assertJsonPath('config.meta_connected', true)
            ->assertJsonPath('settings.cadence_days', 7);
    }

    // ------------------------------------------------------------------

    private function fakeApis(): void
    {
        Http::fake(function (HttpRequest $request) {
            $url = $request->url();
            if (strpos($url, 'api.resend.com') !== false) {
                return Http::response(['data' => [['id' => 'e1']]]);
            }
            if (strpos($url, 'graph.facebook.com') === false) {
                return Http::response([], 404);
            }
            if (strpos($url, '/adcreatives') !== false) {
                return Http::response(['id' => 'cr_' . (++$this->metaIds)]);
            }
            if (preg_match('#/act_\d+/ads$#', parse_url($url, PHP_URL_PATH))) {
                return Http::response(['id' => 'ad_' . (++$this->metaIds)]);
            }
            if (strpos($url, '/media') !== false) {
                return Http::response(['data' => $this->meta['media'] ?? [], 'paging' => []]);
            }
            if ($request->method() === 'GET') {
                return Http::response(['effective_status' => $this->meta['review'] ?? 'PAUSED']);
            }
            if (($request['status'] ?? null) === 'ACTIVE' && isset($this->meta['fail_activate_after'])) {
                if ($this->meta['fail_activate_after']-- <= 0) {
                    return Http::response(['error' => ['message' => 'Ad account has no payment method']], 400);
                }
            }
            return Http::response(['success' => true]);
        });
    }

    private function assertNotSent(callable $callback): void
    {
        $this->assertCount(0, Http::recorded(function ($request) use ($callback) {
            return $callback($request);
        }));
    }

    private function assertEmailSent(string $subjectPrefix): void
    {
        Http::assertSent(function (HttpRequest $r) use ($subjectPrefix) {
            return strpos($r->url(), 'api.resend.com') !== false
                && strpos($r->data()[0]['subject'] ?? '', $subjectPrefix) === 0;
        });
    }

    private function igPost(string $id, int $daysAgo, int $likes, int $comments, string $type): array
    {
        return [
            'id' => $id,
            'caption' => "Caption for {$id}",
            'media_type' => $type,
            'media_url' => "https://cdn.test/{$id}.jpg",
            'permalink' => "https://instagram.com/p/{$id}",
            'timestamp' => Carbon::now()->subDays($daysAgo)->toIso8601String(),
            'like_count' => $likes,
            'comments_count' => $comments,
        ];
    }

    private function scheduledBatch(array $overrides = [], array $backlogItems = []): AdBatch
    {
        $batch = AdBatch::create(array_merge([
            'batch_number' => ((int) AdBatch::max('batch_number')) + 1,
            'status' => 'scheduled',
        ], $overrides));

        $items = $backlogItems ?: [AdBacklogItem::where('angle', 'No shopping, no cooking, no cleanup')->first()];
        foreach ($items as $i => $item) {
            $ad = app(AdService::class)->adFromBacklog($item);
            $ad->image_url = $ad->image_url ?: 'https://cdn.test/dish.jpg';
            $ad->batch_id = $batch->id;
            $ad->sort = $i;
            $ad->save();
        }

        return $batch;
    }

    /** A scheduled batch whose preview went out and whose ads are already in Meta, due now. */
    private function uploadedBatch(?array $backlogItems = null, array $overrides = []): AdBatch
    {
        $batch = $this->scheduledBatch(array_merge([
            'go_live_at' => Carbon::now()->subMinutes(5),
            'preview_sent_at' => Carbon::now()->subHours(49),
        ], $overrides), $backlogItems ?? []);

        foreach ($batch->ads as $ad) {
            $ad->update([
                'meta_ad_id' => 'ad_pre_' . $ad->id,
                'meta_creative_id' => 'cr_pre_' . $ad->id,
                'meta_content_hash' => $ad->contentHash(),
                'meta_status' => 'PAUSED',
            ]);
        }

        return $batch->fresh('ads');
    }

    private function liveBatch(array $overrides = []): AdBatch
    {
        $batch = AdBatch::create(array_merge([
            'batch_number' => ((int) AdBatch::max('batch_number')) + 1,
            'status' => 'live',
            'go_live_at' => Carbon::now()->subDay(),
            'preview_sent_at' => Carbon::now()->subDays(3),
            'launched_at' => Carbon::now()->subDay(),
            'ends_at' => Carbon::now()->addDays(13),
        ], $overrides));
        Ad::create(['batch_id' => $batch->id, 'headline' => 'Live ad', 'meta_ad_id' => 'ad_live_' . $batch->id, 'meta_status' => 'ACTIVE']);

        return $batch->fresh('ads');
    }

    private function actingAsAdmin(): self
    {
        $admin = new Admins(['email' => 'admin@example.com']);
        $admin->id = 1;

        return $this->actingAs($admin, 'adminapi');
    }

    private function setResendKey(?string $value): void
    {
        if ($value === null) {
            putenv('RESEND_API_KEY');
            unset($_ENV['RESEND_API_KEY'], $_SERVER['RESEND_API_KEY']);
            return;
        }
        putenv("RESEND_API_KEY={$value}");
        $_ENV['RESEND_API_KEY'] = $value;
        $_SERVER['RESEND_API_KEY'] = $value;
    }
}
