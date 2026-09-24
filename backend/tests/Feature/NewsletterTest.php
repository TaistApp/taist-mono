<?php

namespace Tests\Feature;

use App\Models\Admins;
use App\Models\NewsletterBacklogItem;
use App\Models\NewsletterEdition;
use App\Models\NewsletterSend;
use App\Models\NewsletterUnsubscribe;
use App\Services\NewsletterService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The newsletter pipeline: auto-drafting, the 48-hour preview to Dayne,
 * delivery through Resend, unsubscribes, and the admin scheduling guard.
 *
 * Resend is faked with Http::fake, so every assertion about "sent" is an
 * assertion about the exact HTTP request that would have gone out.
 */
class NewsletterTest extends TestCase
{
    private const NOW = '2026-10-01 14:00:00';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse(self::NOW, 'UTC'));
        config([
            'app.key' => 'base64:' . base64_encode(str_repeat('k', 32)),
            'app.url' => 'https://api.taist.app',
            'app.newsletter_autosend' => true,
            'app.newsletter_preview_email' => 'dayne@taist.app',
            'app.newsletter_mailing_address' => '123 Main St, Fishers, IN 46038',
        ]);
        $this->setResendKey('re_test_key');

        foreach ([
            'tbl_users', 'waitlist', 'tbl_zipcodes', 'tbl_newsletter_settings', 'tbl_newsletter_editions',
            'tbl_newsletter_backlog', 'tbl_newsletter_unsubscribes', 'tbl_newsletter_sends', 'tbl_discount_codes',
        ] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('email')->nullable();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->tinyInteger('user_type')->default(1);
            $table->tinyInteger('verified')->default(0);
            $table->tinyInteger('is_pending')->default(0);
            $table->string('zip')->nullable();
            $table->string('api_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });
        Schema::create('waitlist', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            $table->string('first_name')->nullable();
            $table->string('zip')->nullable();
            $table->unsignedTinyInteger('user_type')->default(1);
            $table->timestamps();
        });
        Schema::create('tbl_zipcodes', function (Blueprint $table) {
            $table->increments('id');
            $table->text('zipcodes')->nullable();
        });
        DB::table('tbl_zipcodes')->insert(['zipcodes' => '46032,46038']);

        $this->runMigration('2026_06_04_000001_create_newsletter_settings_table.php');
        $this->runMigration('2026_09_24_000001_create_newsletter_editions_tables.php');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        $this->setResendKey(null);
        parent::tearDown();
    }

    // ------------------------------------------------------------------
    // Seeded content and the safety defaults
    // ------------------------------------------------------------------

    public function test_migration_seeds_unscheduled_drafts_and_nothing_sends()
    {
        $this->seedChef(1, 'maria@example.com', 'Maria');
        Http::fake();

        $this->assertSame(2, NewsletterEdition::count());
        $this->assertSame(0, NewsletterEdition::where('status', '!=', 'draft')->count());
        $this->assertSame(0, NewsletterEdition::whereNotNull('send_at')->count());

        $chef = NewsletterEdition::where('user_type', 2)->first();
        $this->assertSame(2, $chef->edition_number);
        $this->assertCount(5, $chef->items);

        $this->artisan('newsletter:run')->assertExitCode(0);

        Http::assertNothingSent();
        // The planner never starts a chain before a first edition was sent.
        $this->assertSame(2, NewsletterEdition::count());
    }

    public function test_command_is_inert_when_autosend_is_off()
    {
        config(['app.newsletter_autosend' => false]);
        $this->seedChef(1, 'maria@example.com', 'Maria');
        $this->scheduledEdition(['send_at' => Carbon::now()->addHours(47)]);
        Http::fake();

        $this->artisan('newsletter:run')->assertExitCode(0);

        Http::assertNothingSent();
    }

    // ------------------------------------------------------------------
    // 48-hour preview
    // ------------------------------------------------------------------

    public function test_preview_goes_to_dayne_once_the_edition_is_within_48_hours()
    {
        $this->seedChef(1, 'maria@example.com', 'Chef Maria');
        $edition = $this->scheduledEdition(['send_at' => Carbon::now()->addHours(47)]);
        Http::fake(['api.resend.com/*' => Http::response(['data' => [['id' => 'msg_1']]])]);

        $this->artisan('newsletter:run')->assertExitCode(0);

        Http::assertSentCount(1);
        Http::assertSent(function (HttpRequest $request) use ($edition) {
            $message = $request->data()[0];
            return $message['to'] === ['dayne@taist.app']
                && strpos($message['subject'], '[Preview, sends') === 0
                // Rendered as the first real recipient would see it ("Chef " prefix stripped).
                && strpos($message['subject'], 'Chef Maria') !== false
                && strpos($message['subject'], 'Chef Chef') === false
                && strpos($message['html'], '/admin-new/newsletters/' . $edition->id) !== false
                && strpos($message['html'], '/newsletter/pause/' . $edition->id) !== false;
        });

        $edition->refresh();
        $this->assertSame('scheduled', $edition->status);
        $this->assertNotNull($edition->preview_sent_at);

        // A second run neither re-sends the preview nor sends the edition early.
        Http::fake();
        $this->artisan('newsletter:run')->assertExitCode(0);
        Http::assertNothingSent();
    }

    public function test_no_preview_while_the_send_is_more_than_48_hours_away()
    {
        $this->seedChef(1, 'maria@example.com', 'Maria');
        $this->scheduledEdition(['send_at' => Carbon::now()->addHours(72)]);
        Http::fake();

        $this->artisan('newsletter:run')->assertExitCode(0);

        Http::assertNothingSent();
    }

    public function test_a_late_preview_holds_the_send_for_the_full_notice_window()
    {
        $this->seedChef(1, 'maria@example.com', 'Maria');
        $edition = $this->scheduledEdition([
            'send_at' => Carbon::now()->subHour(),
            'preview_sent_at' => Carbon::now()->subHours(10),
        ]);
        Http::fake();

        $this->artisan('newsletter:run')->assertExitCode(0);

        Http::assertNothingSent();
        $this->assertSame('scheduled', $edition->fresh()->status);
    }

    public function test_a_failed_preview_blocks_the_send()
    {
        $this->seedChef(1, 'maria@example.com', 'Maria');
        $edition = $this->scheduledEdition(['send_at' => Carbon::now()->addHour()]);
        Http::fake(['api.resend.com/*' => Http::response(['message' => 'boom'], 500)]);

        $this->artisan('newsletter:run')->assertExitCode(0);

        $edition->refresh();
        $this->assertNull($edition->preview_sent_at);
        $this->assertSame('scheduled', $edition->status);
    }

    // ------------------------------------------------------------------
    // Sending
    // ------------------------------------------------------------------

    public function test_due_edition_sends_to_the_audience_with_unsubscribe_headers()
    {
        $this->seedChef(1, 'maria@example.com', 'Maria');
        $this->seedChef(2, 'LUIS@example.com', 'Luis');
        $this->seedChef(3, 'gone@example.com', 'Gone');
        $this->seedChef(4, 'pending@example.com', 'Pending', 0, 1); // not an active chef
        NewsletterUnsubscribe::create(['email' => 'gone@example.com']);

        $backlog = NewsletterBacklogItem::where('user_type', 2)->first();
        $edition = $this->scheduledEdition([
            'send_at' => Carbon::now()->subMinute(),
            'preview_sent_at' => Carbon::now()->subHours(49),
            'items' => [['title' => $backlog->title, 'body' => $backlog->body, 'backlog_id' => $backlog->id]],
        ]);

        Http::fake(['api.resend.com/*' => Http::response(['data' => [['id' => 'a'], ['id' => 'b']]])]);

        $this->artisan('newsletter:run')->assertExitCode(0);

        $batch = null;
        Http::assertSent(function (HttpRequest $request) use (&$batch) {
            if (count($request->data()) === 2) {
                $batch = $request->data();
            }
            return true;
        });
        $this->assertNotNull($batch, 'expected one batch with the two subscribed active chefs');

        $recipients = collect($batch)->pluck('to')->flatten()->sort()->values()->all();
        $this->assertSame(['luis@example.com', 'maria@example.com'], $recipients);

        foreach ($batch as $message) {
            $service = app(NewsletterService::class);
            $url = $service->unsubscribeUrl($message['to'][0]);
            $this->assertSame('<' . $url . '>', $message['headers']['List-Unsubscribe']);
            $this->assertSame('List-Unsubscribe=One-Click', $message['headers']['List-Unsubscribe-Post']);
            $this->assertStringContainsString(htmlspecialchars($url), $message['html']);
            $this->assertStringContainsString('123 Main St, Fishers, IN 46038', $message['html']);
            $this->assertStringContainsString('Unsubscribe: ' . $url, $message['text']);
        }

        $edition->refresh();
        $this->assertSame('sent', $edition->status);
        $this->assertSame(2, $edition->recipient_count);
        $this->assertSame(2, $edition->sent_count);
        $this->assertSame(0, $edition->failed_count);
        $this->assertSame(2, NewsletterSend::where('edition_id', $edition->id)->where('status', 'sent')->count());

        // Featured backlog item is retired so it never repeats.
        $this->assertSame($edition->id, $backlog->fresh()->used_in_edition_id);

        // Dayne gets a short "sent" summary.
        Http::assertSent(function (HttpRequest $request) {
            $m = $request->data()[0];
            return $m['to'] === ['dayne@taist.app'] && strpos($m['subject'], 'Newsletter sent:') === 0;
        });
    }

    public function test_an_interrupted_send_resumes_without_repeating_anyone()
    {
        $this->seedChef(1, 'maria@example.com', 'Maria');
        $this->seedChef(2, 'luis@example.com', 'Luis');
        $edition = $this->scheduledEdition([
            'status' => 'sending',
            'send_at' => Carbon::now()->subHour(),
            'preview_sent_at' => Carbon::now()->subHours(50),
        ]);
        NewsletterSend::create(['edition_id' => $edition->id, 'email' => 'maria@example.com', 'status' => 'sent']);
        NewsletterSend::create(['edition_id' => $edition->id, 'email' => 'luis@example.com', 'status' => 'pending']);

        Http::fake(['api.resend.com/*' => Http::response(['data' => [['id' => 'x']]])]);

        $this->artisan('newsletter:run')->assertExitCode(0);

        Http::assertSent(function (HttpRequest $request) {
            $m = $request->data()[0];
            return $m['to'] === ['luis@example.com'];
        });
        Http::assertNotSent(function (HttpRequest $request) {
            return collect($request->data())->pluck('to')->flatten()->contains('maria@example.com');
        });
        $this->assertSame('sent', $edition->fresh()->status);
    }

    // ------------------------------------------------------------------
    // Auto-drafting
    // ------------------------------------------------------------------

    public function test_after_a_send_the_next_edition_is_drafted_from_the_backlog_and_scheduled()
    {
        NewsletterEdition::query()->delete();
        NewsletterEdition::create([
            'user_type' => 2, 'kind' => 'regular', 'edition_number' => 2, 'status' => 'sent',
            'subject' => 'Digest #2', 'sent_at' => Carbon::now()->subDays(3),
        ]);
        Http::fake();

        $this->artisan('newsletter:run')->assertExitCode(0);

        $next = NewsletterEdition::where('user_type', 2)->where('status', 'scheduled')->first();
        $this->assertNotNull($next);
        $this->assertSame(3, $next->edition_number);
        $this->assertSame('auto', $next->created_by);
        $this->assertCount(5, $next->items);
        $this->assertNotEmpty($next->items[0]['backlog_id']);

        // 14 days after the last send, 10:00 Eastern.
        $this->assertSame('2026-10-12 10:00', $next->send_at->copy()->setTimezone('America/New_York')->format('Y-m-d H:i'));

        // Customers have no sent edition yet, so no chain there.
        $this->assertSame(0, NewsletterEdition::where('user_type', 1)->count());
    }

    public function test_an_auto_draft_is_never_scheduled_inside_the_notice_window()
    {
        NewsletterEdition::query()->delete();
        NewsletterEdition::create([
            'user_type' => 2, 'kind' => 'regular', 'edition_number' => 2, 'status' => 'sent',
            'subject' => 'Digest #2', 'sent_at' => Carbon::now()->subDays(30),
        ]);
        Http::fake();

        $this->artisan('newsletter:run')->assertExitCode(0);

        $next = NewsletterEdition::where('user_type', 2)->where('status', 'scheduled')->first();
        $this->assertTrue($next->send_at->greaterThanOrEqualTo(Carbon::now()->addHours(48)));
    }

    public function test_an_empty_backlog_yields_an_unscheduled_draft_and_a_heads_up()
    {
        NewsletterEdition::query()->delete();
        NewsletterBacklogItem::where('user_type', 1)->update(['used_at' => Carbon::now()]);
        NewsletterEdition::create([
            'user_type' => 1, 'kind' => 'regular', 'edition_number' => 1, 'status' => 'sent',
            'subject' => 'Welcome', 'sent_at' => Carbon::now()->subDays(12),
        ]);
        Http::fake(['api.resend.com/*' => Http::response(['data' => [['id' => 'n']]])]);

        $this->artisan('newsletter:run')->assertExitCode(0);

        $next = NewsletterEdition::where('user_type', 1)->where('edition_number', 2)->first();
        $this->assertSame('draft', $next->status);
        Http::assertSent(function (HttpRequest $request) {
            $m = $request->data()[0];
            return $m['to'] === ['dayne@taist.app'] && strpos($m['subject'], 'Newsletter needs content') === 0;
        });

        // The open draft stops the planner from piling up more editions.
        $this->artisan('newsletter:run')->assertExitCode(0);
        $this->assertSame(1, NewsletterEdition::where('user_type', 1)->where('status', 'draft')->count());
    }

    public function test_auto_schedule_off_stops_the_chain()
    {
        NewsletterEdition::query()->delete();
        DB::table('tbl_newsletter_settings')->where('user_type', 2)->update(['auto_schedule' => false]);
        NewsletterEdition::create([
            'user_type' => 2, 'kind' => 'regular', 'edition_number' => 2, 'status' => 'sent',
            'subject' => 'Digest #2', 'sent_at' => Carbon::now()->subDays(3),
        ]);
        Http::fake();

        $this->artisan('newsletter:run')->assertExitCode(0);

        $this->assertSame(1, NewsletterEdition::count());
    }

    // ------------------------------------------------------------------
    // Unsubscribe + pause links
    // ------------------------------------------------------------------

    public function test_unsubscribe_link_confirms_then_unsubscribes()
    {
        $service = app(NewsletterService::class);
        $url = $service->unsubscribeUrl('Maria@Example.com');
        $path = parse_url($url, PHP_URL_PATH) . '?' . parse_url($url, PHP_URL_QUERY);

        // GET only shows the confirmation, so link scanners change nothing.
        $this->get($path)->assertOk()->assertSee('Unsubscribe from Taist newsletters?');
        $this->assertSame(0, NewsletterUnsubscribe::count());

        $this->post($path)->assertOk()->assertSee("You're unsubscribed");
        $this->assertTrue($service->isUnsubscribed('maria@example.com'));

        $this->post(str_replace('/unsubscribe', '/resubscribe', $path))->assertOk();
        $this->assertFalse($service->isUnsubscribed('maria@example.com'));
    }

    public function test_one_click_unsubscribe_from_a_mail_client()
    {
        $url = app(NewsletterService::class)->unsubscribeUrl('maria@example.com');
        $path = parse_url($url, PHP_URL_PATH) . '?' . parse_url($url, PHP_URL_QUERY);

        $this->post($path, ['List-Unsubscribe' => 'One-Click'])->assertOk();

        $this->assertSame('one-click', NewsletterUnsubscribe::first()->source);
    }

    public function test_tampered_unsubscribe_token_is_rejected()
    {
        $this->get('/newsletter/unsubscribe?e=maria@example.com&t=deadbeef')->assertStatus(404);
        $this->post('/newsletter/unsubscribe?e=maria@example.com&t=deadbeef')->assertStatus(403);
        $this->assertSame(0, NewsletterUnsubscribe::count());
    }

    public function test_pause_link_returns_a_scheduled_edition_to_draft()
    {
        $edition = $this->scheduledEdition([
            'send_at' => Carbon::now()->addHours(40),
            'preview_sent_at' => Carbon::now()->subHours(8),
        ]);
        $token = app(NewsletterService::class)->pauseToken($edition);

        $this->post("/newsletter/pause/{$edition->id}?t=bad")->assertStatus(403);
        $this->assertSame('scheduled', $edition->fresh()->status);

        $this->get("/newsletter/pause/{$edition->id}?t={$token}")->assertOk();
        $this->assertSame('scheduled', $edition->fresh()->status);

        $this->post("/newsletter/pause/{$edition->id}?t={$token}")->assertOk()->assertSee('Paused');
        $this->assertSame('draft', $edition->fresh()->status);
        $this->assertNull($edition->fresh()->preview_sent_at);
    }

    // ------------------------------------------------------------------
    // Admin API
    // ------------------------------------------------------------------

    public function test_admin_cannot_schedule_inside_the_48_hour_notice_window()
    {
        $edition = NewsletterEdition::where('user_type', 1)->first();
        $tooSoon = Carbon::now()->addHours(47)->setTimezone('America/New_York')->format('Y-m-d\TH:i');
        $okTime = Carbon::now()->addHours(49)->setTimezone('America/New_York')->format('Y-m-d\TH:i');

        $this->actingAsAdmin()
            ->postJson("/admin-api-v2/newsletters/{$edition->id}/schedule", ['send_at_et' => $tooSoon])
            ->assertStatus(422);
        $this->assertSame('draft', $edition->fresh()->status);

        $this->actingAsAdmin()
            ->postJson("/admin-api-v2/newsletters/{$edition->id}/schedule", ['send_at_et' => $okTime])
            ->assertOk()->assertJsonPath('edition.status', 'scheduled')
            ->assertJsonPath('edition.send_at_et', $okTime);
    }

    public function test_admin_edits_save_and_render_with_warnings()
    {
        Schema::create('tbl_discount_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code');
            $table->string('discount_type')->default('percentage');
            $table->decimal('discount_value', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->integer('max_uses')->nullable();
            $table->integer('current_uses')->default(0);
            $table->timestamps();
        });
        DB::table('tbl_discount_codes')->insert(['code' => 'EARLYTAIST', 'is_active' => false]);
        $this->seedCustomer(9, 'ana@example.com', 'Ana', '46032');

        $edition = NewsletterEdition::where('user_type', 1)->first();

        $this->actingAsAdmin()
            ->putJson("/admin-api-v2/newsletters/{$edition->id}", ['items' => array_fill(0, 6, ['title' => 'x'])])
            ->assertStatus(422);

        $response = $this->actingAsAdmin()
            ->putJson("/admin-api-v2/newsletters/{$edition->id}", [
                'headline' => 'Hi {first_name}, dinner is served.',
                'items' => [['title' => 'Use code EARLYTAIST', 'body' => 'for 30% off.']],
            ])
            ->assertOk();

        $this->assertStringContainsString('EARLYTAIST will not work', implode(' ', $response->json('warnings')));
        $this->assertSame('Hi {first_name}, dinner is served.', $edition->fresh()->headline);

        $render = $this->actingAsAdmin()
            ->postJson('/admin-api-v2/newsletters/render', ['id' => $edition->id, 'subject' => 'Hello {first_name}'])
            ->assertOk();
        $this->assertSame('Hello Ana', $render->json('subject'));
        $this->assertStringContainsString('Hi Ana, dinner is served.', $render->json('html'));
    }

    public function test_make_recipient_endpoint_excludes_unsubscribes()
    {
        config(['app.newsletter_api_key' => 'k']);
        $this->seedChef(1, 'maria@example.com', 'Maria');
        $this->seedChef(2, 'gone@example.com', 'Gone');
        NewsletterUnsubscribe::create(['email' => 'gone@example.com']);

        $this->getJson('/admin-api-v2/newsletter-recipients?user_type=2', ['X-Newsletter-Key' => 'k'])
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('recipients.0.email', 'maria@example.com');
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function runMigration(string $file): void
    {
        $class = \Illuminate\Support\Str::studly(implode('_', array_slice(explode('_', basename($file, '.php')), 4)));
        if (!class_exists($class, false)) {
            require_once database_path('migrations/' . $file);
        }
        (new $class)->up();
    }

    private function scheduledEdition(array $overrides = []): NewsletterEdition
    {
        return NewsletterEdition::create(array_merge([
            'user_type' => 2,
            'kind' => 'regular',
            'edition_number' => 9,
            'status' => 'scheduled',
            'subject' => 'Update for Chef {first_name}',
            'headline' => 'Hey Chef {first_name}',
            'intro' => 'News.',
            'items' => [['title' => 'One', 'body' => 'thing']],
        ], $overrides));
    }

    private function seedChef(int $id, string $email, string $firstName, int $verified = 1, int $pending = 0): void
    {
        DB::table('tbl_users')->insert([
            'id' => $id, 'email' => $email, 'first_name' => $firstName, 'last_name' => 'L',
            'user_type' => 2, 'verified' => $verified, 'is_pending' => $pending,
        ]);
    }

    private function seedCustomer(int $id, string $email, string $firstName, string $zip): void
    {
        DB::table('tbl_users')->insert([
            'id' => $id, 'email' => $email, 'first_name' => $firstName, 'last_name' => 'L',
            'user_type' => 1, 'verified' => 1, 'zip' => $zip,
        ]);
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
