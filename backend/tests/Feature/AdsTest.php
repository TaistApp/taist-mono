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
 * The paid-ads pipeline: weekly auto-drafting from the backlog, the 48-hour
 * preview to Dayne, approval at go-live, the pause link, and the admin
 * scheduling guard. Resend is faked with Http::fake.
 */
class AdsTest extends TestCase
{
    private const NOW = '2026-10-01 14:00:00';

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
        ]);
        $this->setResendKey('re_test_key');

        foreach (['tbl_ad_batches', 'tbl_ads', 'tbl_ad_backlog', 'tbl_ad_settings', 'tbl_dish_photos', 'tbl_discount_codes'] as $table) {
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
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        $this->setResendKey(null);
        parent::tearDown();
    }

    public function test_migration_seeds_backlog_only_and_nothing_runs()
    {
        Http::fake();

        $this->assertSame(5, AdBacklogItem::count());
        $this->assertSame(0, AdBatch::count());

        // Seeded copy follows the content rules.
        $ads = app(AdService::class);
        foreach (AdBacklogItem::all() as $item) {
            $warnings = $ads->adWarnings($ads->adFromBacklog($item));
            // Only "no image" is expected: images come from dish photos.
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
        Http::fake();

        $this->artisan('ads:run')->assertExitCode(0);

        Http::assertNothingSent();
    }

    public function test_preview_goes_to_dayne_48h_ahead_with_pause_link()
    {
        $batch = $this->scheduledBatch(['go_live_at' => Carbon::now()->addHours(47)]);
        $later = $this->scheduledBatch(['go_live_at' => Carbon::now()->addHours(60)]);
        Http::fake(['api.resend.com/*' => Http::response(['data' => [['id' => 'e1']]])]);

        $this->artisan('ads:run')->assertExitCode(0);

        Http::assertSentCount(1);
        Http::assertSent(function (HttpRequest $request) use ($batch) {
            $message = $request->data()[0];
            return $message['to'] === ['dayne@taist.app']
                && strpos($message['subject'], '[Ads preview') === 0
                && strpos($message['html'], 'Dinner, handled.') !== false
                && strpos($message['html'], '/ads/pause/' . $batch->id . '?t=') !== false
                && strpos($message['html'], '/admin-new/ads/' . $batch->id) !== false;
        });
        $this->assertNotNull($batch->fresh()->preview_sent_at);
        $this->assertNull($later->fresh()->preview_sent_at);
    }

    public function test_late_preview_pushes_go_live_back_a_full_window()
    {
        $batch = $this->scheduledBatch([
            'go_live_at' => Carbon::now()->subHour(),
            'preview_sent_at' => Carbon::now()->subHours(10),
        ]);
        Http::fake();

        $this->artisan('ads:run')->assertExitCode(0);

        $this->assertSame('scheduled', $batch->fresh()->status);
        Http::assertNothingSent();
    }

    public function test_due_batch_is_approved_backlog_retired_and_next_batch_planned()
    {
        $items = AdBacklogItem::orderBy('sort')->get();
        $batch = $this->scheduledBatch([
            'go_live_at' => Carbon::now()->subMinutes(5),
            'preview_sent_at' => Carbon::now()->subHours(49),
        ], $items->take(2)->all());
        DB::table('tbl_dish_photos')->insert([
            ['filename' => 'a.jpg', 'status' => 'approved', 'queued_for_social' => 1],
            ['filename' => 'b.jpg', 'status' => 'approved', 'queued_for_social' => 1],
            ['filename' => 'c.jpg', 'status' => 'approved', 'queued_for_social' => 1],
            ['filename' => 'rejected.jpg', 'status' => 'rejected', 'queued_for_social' => 1],
            ['filename' => 'private.jpg', 'status' => 'approved', 'queued_for_social' => 0],
        ]);
        Http::fake(['api.resend.com/*' => Http::response(['data' => [['id' => 'e1']]])]);

        $this->artisan('ads:run')->assertExitCode(0);

        $batch->refresh();
        $this->assertSame('ready', $batch->status);
        $this->assertSame(
            Carbon::now()->subMinutes(5)->addDays(14)->toDateTimeString(),
            $batch->ends_at->toDateTimeString()
        );
        $this->assertSame(2, AdBacklogItem::whereNotNull('used_at')->where('used_in_batch_id', $batch->id)->count());

        Http::assertSent(function (HttpRequest $request) {
            return strpos($request->data()[0]['subject'], 'Ready to launch') === 0;
        });

        // Next batch: 7 days after this one, at 10:00 ET, from the unused ideas.
        $next = AdBatch::where('id', '!=', $batch->id)->first();
        $this->assertNotNull($next);
        $this->assertSame('scheduled', $next->status);
        $this->assertSame('auto', $next->created_by);
        $this->assertSame('2026-10-08 10:00', $next->go_live_at->copy()->setTimezone('America/New_York')->format('Y-m-d H:i'));
        $this->assertSame(3, $next->ads->count());
        $this->assertSame(
            $items->slice(2, 3)->pluck('id')->all(),
            $next->ads->pluck('backlog_id')->all()
        );
        // Each ad got a different approved, social-queued dish photo.
        $photos = $next->ads->pluck('dish_photo_id')->all();
        $this->assertCount(3, array_unique(array_filter($photos)));
        $this->assertStringContainsString('/assets/uploads/images/', $next->ads->first()->image_url);
        $this->assertFalse(in_array('rejected.jpg', $next->ads->pluck('image_url')->map('basename')->all(), true));
        $this->assertFalse(in_array('private.jpg', $next->ads->pluck('image_url')->map('basename')->all(), true));
        // Organic posting's no-repeat ledger is untouched.
        $this->assertFalse(Schema::hasTable('social_posted_receipts') && DB::table('social_posted_receipts')->exists());
    }

    public function test_empty_backlog_drafts_unscheduled_batch_and_asks_for_content()
    {
        AdBacklogItem::query()->update(['used_at' => Carbon::now()->subDay()]);
        AdBatch::create([
            'batch_number' => 1,
            'status' => 'ready',
            'go_live_at' => Carbon::now()->subDay(),
            'preview_sent_at' => Carbon::now()->subDays(3),
        ]);
        Http::fake(['api.resend.com/*' => Http::response(['data' => [['id' => 'e1']]])]);

        $this->artisan('ads:run')->assertExitCode(0);

        $next = AdBatch::where('batch_number', 2)->first();
        $this->assertSame('draft', $next->status);
        Http::assertSent(function (HttpRequest $request) {
            return strpos($request->data()[0]['subject'], 'Ads need content') === 0;
        });

        // No duplicate drafts on the next run.
        $this->artisan('ads:run')->assertExitCode(0);
        $this->assertSame(2, AdBatch::count());
    }

    public function test_live_batch_ends_after_run_length_with_reminder()
    {
        $batch = AdBatch::create([
            'batch_number' => 1,
            'status' => 'live',
            'go_live_at' => Carbon::now()->subDays(15),
            'preview_sent_at' => Carbon::now()->subDays(17),
            'ends_at' => Carbon::now()->subDay(),
        ]);
        AdSettings::create(array_merge(AdSettings::DEFAULTS, ['auto_schedule' => false]));
        Http::fake(['api.resend.com/*' => Http::response(['data' => [['id' => 'e1']]])]);

        $this->artisan('ads:run')->assertExitCode(0);

        $this->assertSame('ended', $batch->fresh()->status);
        Http::assertSent(function (HttpRequest $request) {
            return strpos($request->data()[0]['subject'], 'Turn off ads') === 0;
        });
        $this->assertSame(1, AdBatch::count());
    }

    public function test_pause_link_returns_batch_to_draft()
    {
        $batch = $this->scheduledBatch(['go_live_at' => Carbon::now()->addHours(20), 'preview_sent_at' => Carbon::now()]);
        $token = app(AdService::class)->pauseToken($batch);

        $this->get("/ads/pause/{$batch->id}?t=bad")->assertStatus(404);
        $this->get("/ads/pause/{$batch->id}?t={$token}")->assertOk()->assertSee('Pause this batch');
        $this->assertSame('scheduled', $batch->fresh()->status);

        $this->post("/ads/pause/{$batch->id}?t={$token}")->assertOk()->assertSee('Paused');
        $this->assertSame('draft', $batch->fresh()->status);
        $this->assertNull($batch->fresh()->preview_sent_at);
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

    public function test_new_batch_prefills_from_backlog_and_can_be_marked_launched()
    {
        $res = $this->actingAsAdmin()->postJson('/admin-api-v2/ad-batches')->assertOk();
        $this->assertCount(3, $res->json('batch.ads'));

        $batch = AdBatch::find($res->json('batch.id'));
        $batch->update(['status' => 'ready', 'go_live_at' => Carbon::now(), 'ends_at' => Carbon::now()->addDays(14)]);
        $adId = $batch->ads->first()->id;

        $this->actingAsAdmin()
            ->postJson("/admin-api-v2/ad-batches/{$batch->id}/launched", ['meta_ad_ids' => [$adId => '1202000000000']])
            ->assertOk()->assertJsonPath('batch.status', 'live');
        $this->assertSame('1202000000000', Ad::find($adId)->meta_ad_id);

        $this->actingAsAdmin()->getJson('/admin-api-v2/ad-batches')->assertOk()
            ->assertJsonPath('batches.0.status', 'live')
            ->assertJsonPath('settings.cadence_days', 7);
    }

    // ------------------------------------------------------------------

    private function scheduledBatch(array $overrides = [], array $backlogItems = []): AdBatch
    {
        $batch = AdBatch::create(array_merge([
            'batch_number' => ((int) AdBatch::max('batch_number')) + 1,
            'status' => 'scheduled',
        ], $overrides));

        $items = $backlogItems ?: [AdBacklogItem::where('angle', 'No shopping, no cooking, no cleanup')->first()];
        foreach ($items as $i => $item) {
            $ad = app(AdService::class)->adFromBacklog($item);
            $ad->batch_id = $batch->id;
            $ad->sort = $i;
            $ad->save();
        }

        return $batch;
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
