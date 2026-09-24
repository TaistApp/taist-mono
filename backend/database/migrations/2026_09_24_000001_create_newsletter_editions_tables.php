<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Moves newsletters from hand-run Make.com scenarios into the backend:
 *
 *   tbl_newsletter_editions     one row per email edition (structured content, schedule, status)
 *   tbl_newsletter_backlog      queued updates the auto-drafter pulls from, so no update repeats
 *   tbl_newsletter_unsubscribes opt-outs, keyed by email so waitlist leads are covered too
 *   tbl_newsletter_sends        per-recipient delivery log (also makes a crashed send resumable)
 *
 * Also adds the automation settings to tbl_newsletter_settings and seeds the
 * two editions that were pending when this shipped: Chef Regular #2 and the
 * first customer newsletter. Both are seeded as unscheduled drafts, so nothing
 * goes out until an admin schedules them once.
 */
class CreateNewsletterEditionsTables extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('tbl_newsletter_editions')) {
            Schema::create('tbl_newsletter_editions', function (Blueprint $table) {
                $table->id();
                $table->unsignedTinyInteger('user_type')->comment('1 = customer, 2 = chef');
                $table->string('kind', 16)->default('regular')->comment('regular|special');
                $table->unsignedInteger('edition_number')->nullable();
                $table->string('status', 16)->default('draft')
                    ->comment('draft|scheduled|sending|sent|cancelled');
                $table->string('subject');
                $table->string('preheader')->nullable();
                $table->string('eyebrow')->nullable();
                $table->string('headline')->nullable();
                $table->text('intro')->nullable();
                $table->string('callout_title')->nullable();
                $table->string('callout_subtitle')->nullable();
                $table->string('items_heading')->nullable();
                $table->text('items')->nullable()->comment('JSON [{title, body, backlog_id?}]');
                $table->text('closing')->nullable();
                $table->string('signoff')->nullable();
                $table->string('cta_label')->nullable();
                $table->string('cta_url')->nullable();
                $table->timestamp('send_at')->nullable();
                $table->timestamp('preview_sent_at')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->unsignedInteger('recipient_count')->default(0);
                $table->unsignedInteger('sent_count')->default(0);
                $table->unsignedInteger('failed_count')->default(0);
                $table->string('created_by', 16)->default('admin')->comment('admin|auto|seed');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['status', 'send_at']);
                $table->index(['user_type', 'kind', 'status']);
            });
        }

        if (!Schema::hasTable('tbl_newsletter_backlog')) {
            Schema::create('tbl_newsletter_backlog', function (Blueprint $table) {
                $table->id();
                $table->unsignedTinyInteger('user_type');
                $table->string('title');
                $table->text('body')->nullable();
                $table->unsignedInteger('sort')->default(0);
                $table->unsignedBigInteger('used_in_edition_id')->nullable();
                $table->timestamp('used_at')->nullable();
                $table->timestamps();

                $table->index(['user_type', 'used_at']);
            });
        }

        if (!Schema::hasTable('tbl_newsletter_unsubscribes')) {
            Schema::create('tbl_newsletter_unsubscribes', function (Blueprint $table) {
                $table->id();
                $table->string('email')->unique();
                $table->unsignedTinyInteger('user_type')->nullable();
                $table->string('source', 32)->default('link')->comment('link|one-click|admin');
                $table->unsignedBigInteger('edition_id')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('tbl_newsletter_sends')) {
            Schema::create('tbl_newsletter_sends', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('edition_id');
                $table->string('email');
                $table->string('first_name')->nullable();
                $table->string('status', 16)->default('pending')->comment('pending|sent|failed');
                $table->string('provider_id')->nullable();
                $table->string('error', 500)->nullable();
                $table->timestamps();

                $table->unique(['edition_id', 'email']);
                $table->index(['edition_id', 'status']);
            });
        }

        if (Schema::hasTable('tbl_newsletter_settings')) {
            Schema::table('tbl_newsletter_settings', function (Blueprint $table) {
                if (!Schema::hasColumn('tbl_newsletter_settings', 'auto_schedule')) {
                    $table->boolean('auto_schedule')->default(true);
                }
                if (!Schema::hasColumn('tbl_newsletter_settings', 'cadence_days')) {
                    $table->unsignedSmallInteger('cadence_days')->default(14);
                }
                if (!Schema::hasColumn('tbl_newsletter_settings', 'send_time')) {
                    $table->string('send_time', 5)->default('10:00')->comment('HH:MM America/New_York');
                }
            });
        }

        $this->seedContent();
    }

    public function down()
    {
        Schema::dropIfExists('tbl_newsletter_sends');
        Schema::dropIfExists('tbl_newsletter_unsubscribes');
        Schema::dropIfExists('tbl_newsletter_backlog');
        Schema::dropIfExists('tbl_newsletter_editions');

        if (Schema::hasTable('tbl_newsletter_settings')) {
            Schema::table('tbl_newsletter_settings', function (Blueprint $table) {
                foreach (['auto_schedule', 'cadence_days', 'send_time'] as $column) {
                    if (Schema::hasColumn('tbl_newsletter_settings', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }

    /**
     * Seed once: skipped entirely if any edition already exists.
     */
    private function seedContent()
    {
        if (DB::table('tbl_newsletter_editions')->exists()) {
            return;
        }

        $now = now();

        // Chef Regular #2. Digest #1 went out via Make on 2026-06-15 and used:
        // minimum order total, arrival & parking details, share-your-profile links.
        // Discount funding is left out on purpose (Dayne, 2026-09-24).
        DB::table('tbl_newsletter_editions')->insert([
            'user_type' => 2,
            'kind' => 'regular',
            'edition_number' => 2,
            'status' => 'draft',
            'subject' => 'Taist Digest #2: 5 upgrades built for you, Chef {first_name}',
            'preheader' => 'Faster payouts setup, smarter order reminders, and chat alerts that always arrive.',
            'eyebrow' => "What's New",
            'headline' => "Hey Chef {first_name}, here's what's new.",
            'intro' => "It's been a busy summer at Taist. We've been listening to your feedback and shipping updates to make every order smoother, from setup to the final plate.\n\nHere are the five biggest changes on your side of the app:",
            'callout_title' => null,
            'callout_subtitle' => null,
            'items_heading' => null,
            'items' => json_encode([
                [
                    'title' => 'Payouts setup in one tap.',
                    'body' => "Connect Stripe straight from your home screen. Enter your details once and you're ready to get paid.",
                ],
                [
                    'title' => 'Step-by-step order reminders.',
                    'body' => "We'll nudge you to prep ingredients, tap On My Way before you head out, and wrap up with a dish photo once you're done.",
                ],
                [
                    'title' => 'Never miss an order.',
                    'body' => "Your home screen now flags any order that was cancelled or expired, and you'll get a notification the moment it happens.",
                ],
                [
                    'title' => 'Chat alerts that always arrive.',
                    'body' => 'Every customer message now sends a push notification. Tap it to jump straight into the conversation.',
                ],
                [
                    'title' => 'Pause your account anytime.',
                    'body' => 'Need a break? Pause from the app menu to hide your profile from customers, then come back whenever you are ready.',
                ],
            ]),
            'closing' => "Make sure notifications are turned on for Taist so you never miss a new order or reminder. Questions, or something you need to get cooking? Just hit reply, we read every one.",
            'signoff' => '- Dayne & Daryl',
            'cta_label' => 'Open Taist',
            'cta_url' => 'https://apps.apple.com/app/1598624809',
            'send_at' => null,
            'created_by' => 'seed',
            'notes' => 'Seeded draft. Schedule it from the admin panel to start the biweekly chain.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Customer #1 ("Welcome In"), drafted in Make #5233475 but never sent.
        DB::table('tbl_newsletter_editions')->insert([
            'user_type' => 1,
            'kind' => 'regular',
            'edition_number' => 1,
            'status' => 'draft',
            'subject' => "It's official, {first_name}. Taist is live in Indy.",
            'preheader' => 'Taist is live in Indianapolis. Your first home-cooked meal is a few taps away.',
            'eyebrow' => 'Welcome In',
            'headline' => 'Hey {first_name}, Taist is officially cooking.',
            'intro' => "This is our very first Taist newsletter, so before anything else, thank you. You signed up early, and that genuinely means a lot to a small team building something new here in Indianapolis.\n\nHere's the short version: Taist is live. Real personal chefs in your area are cooking real menus, and you can book one to come make a meal right in your own kitchen.",
            'callout_title' => 'No grocery shopping. No cooking. And no cleanup.',
            'callout_subtitle' => 'Starting at $60-80/table · Taist chefs do meal prep for individuals too!',
            'items_heading' => 'Getting your first meal is easy:',
            'items' => json_encode([
                [
                    'title' => 'Download & open the app.',
                    'body' => 'Use code TAIST30 for 30% off your first order.',
                ],
                [
                    'title' => 'Browse chefs & menus near you.',
                    'body' => 'Every chef sets their own dishes and prices.',
                ],
                [
                    'title' => 'Pick your date, they handle the rest.',
                    'body' => 'Your chef shops, cooks, and cleans up.',
                ],
            ]),
            'closing' => "We're adding new chefs and opening up new neighborhoods every couple of weeks, and we'll keep you in the loop right here. Got a question, or a chef you'd love to see? Just hit reply, we read every one.",
            'signoff' => null,
            'cta_label' => 'Order on Taist',
            'cta_url' => 'https://apps.apple.com/app/1598624809',
            'send_at' => null,
            'created_by' => 'seed',
            'notes' => 'Seeded from the unsent Make draft. Uses TAIST30 (EARLYTAIST expired).',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Backlog: shipped features not featured yet, for future auto-drafts.
        $backlog = [
            [2, 'A heads-up for every review.', "You now get a notification for every new review, with or without a tip, so you can see what customers loved."],
            [2, 'Customer name and unit number on every order.', 'Know exactly who you are cooking for and which door to knock on, including apartment and unit numbers.'],
            [2, 'A new Meal Prep category.', 'List meal-prep packages as their own dishes. Serving size defaults to the number of meals you offer.'],
            [2, 'Dish photos after every order.', "When you mark an order complete, snap the finished dish. Great photos get featured on Taist's socials."],
            [1, 'A faster, simpler checkout.', 'Checkout got a clean new look with a clear receipt summary and a faster, more secure way to pay.'],
            [1, 'Never miss a message from your chef.', 'Every chat message now arrives as a notification. Tap it to jump straight into the conversation.'],
            [1, 'Easier password resets.', 'Show and hide your password as you type, resend the code if it does not arrive, and see a clear confirmation when you are done.'],
            [1, "Quick recovery if a chef can't make it.", 'If a chef has to turn down your order, we point you straight to similar chefs so dinner stays on track.'],
        ];

        foreach ($backlog as $i => [$userType, $title, $body]) {
            DB::table('tbl_newsletter_backlog')->insert([
                'user_type' => $userType,
                'title' => $title,
                'body' => $body,
                'sort' => $i,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
