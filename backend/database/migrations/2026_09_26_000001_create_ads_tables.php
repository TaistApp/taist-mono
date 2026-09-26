<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Paid Instagram/Facebook ads, drafted and previewed the same way as the
 * newsletters:
 *
 *   tbl_ad_batches   one weekly batch of ads (schedule, status, preview)
 *   tbl_ads          the ads in a batch (copy, image, CTA, link)
 *   tbl_ad_backlog   ad ideas the planner pulls from, so no idea repeats
 *   tbl_ad_settings  single row: cadence, ads per batch, go-live time, run length
 *
 * Customer ads only. Ads are created in Meta (paused) when the preview goes
 * out and switched on at go-live by `ads:run`. The backlog is seeded, but no
 * batch is created or scheduled, so nothing happens until an admin schedules
 * the first batch.
 */
class CreateAdsTables extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('tbl_ad_batches')) {
            Schema::create('tbl_ad_batches', function (Blueprint $table) {
                $table->id();
                $table->unsignedInteger('batch_number')->nullable();
                $table->string('status', 16)->default('draft')
                    ->comment('draft|scheduled|live|ended|cancelled');
                $table->timestamp('go_live_at')->nullable();
                $table->timestamp('preview_sent_at')->nullable();
                $table->timestamp('launched_at')->nullable();
                $table->timestamp('ends_at')->nullable();
                $table->timestamp('ended_at')->nullable();
                $table->string('created_by', 16)->default('admin')->comment('admin|auto');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['status', 'go_live_at']);
            });
        }

        if (!Schema::hasTable('tbl_ads')) {
            Schema::create('tbl_ads', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('batch_id');
                $table->unsignedBigInteger('backlog_id')->nullable();
                $table->unsignedInteger('sort')->default(0);
                $table->string('angle')->nullable()->comment('Internal name, never shown in the ad');
                $table->text('primary_text')->nullable();
                $table->string('headline')->nullable();
                $table->string('description')->nullable();
                $table->string('cta', 32)->default('LEARN_MORE')->comment('Meta call_to_action type');
                $table->string('link_url', 500)->nullable();
                $table->string('image_url', 500)->nullable();
                $table->unsignedBigInteger('dish_photo_id')->nullable()->comment('tbl_dish_photos.id when the image is a chef dish photo');
                $table->string('meta_ad_id', 64)->nullable();
                $table->string('meta_creative_id', 64)->nullable();
                $table->string('meta_content_hash', 64)->nullable()->comment('Content the Meta ad was built from, to detect edits');
                $table->string('meta_status', 32)->nullable()->comment('Last known Meta effective_status');
                $table->string('meta_note', 500)->nullable()->comment('Meta error or review feedback');
                $table->string('source_ig_media_id', 64)->nullable()->comment('Organic Instagram post this ad recycles');
                $table->string('source_permalink', 500)->nullable();
                $table->timestamps();

                $table->index('batch_id');
                $table->index('dish_photo_id');
                $table->index('source_ig_media_id');
            });
        }

        if (!Schema::hasTable('tbl_ad_backlog')) {
            Schema::create('tbl_ad_backlog', function (Blueprint $table) {
                $table->id();
                $table->string('angle');
                $table->text('primary_text')->nullable();
                $table->string('headline')->nullable();
                $table->string('description')->nullable();
                $table->string('cta', 32)->nullable();
                $table->string('link_url', 500)->nullable();
                $table->string('image_url', 500)->nullable();
                $table->unsignedInteger('sort')->default(0);
                $table->unsignedBigInteger('used_in_batch_id')->nullable();
                $table->timestamp('used_at')->nullable();
                $table->timestamps();

                $table->index('used_at');
            });
        }

        if (!Schema::hasTable('tbl_ad_settings')) {
            Schema::create('tbl_ad_settings', function (Blueprint $table) {
                $table->id();
                $table->boolean('auto_schedule')->default(true);
                $table->unsignedSmallInteger('cadence_days')->default(7);
                $table->unsignedTinyInteger('ads_per_batch')->default(3);
                $table->string('go_live_time', 5)->default('10:00')->comment('HH:MM America/New_York');
                $table->unsignedSmallInteger('run_days')->default(14);
                $table->timestamps();
            });
        }

        $this->seedBacklog();
    }

    public function down()
    {
        Schema::dropIfExists('tbl_ad_settings');
        Schema::dropIfExists('tbl_ad_backlog');
        Schema::dropIfExists('tbl_ads');
        Schema::dropIfExists('tbl_ad_batches');
    }

    /**
     * Starter ideas, written to the taist-social content rules (no "free", no
     * Zionsville, no parking claims, no em dashes). Images are left empty so
     * the planner attaches an approved chef dish photo.
     */
    private function seedBacklog()
    {
        if (DB::table('tbl_ad_backlog')->exists()) {
            return;
        }

        $now = now();
        $ideas = [
            [
                'First order offer (TAIST30)',
                'A local chef shops, cooks in your kitchen and cleans up after. Use code TAIST30 for 30% off your first order.',
                '30% off your first chef night',
                'Code TAIST30 at checkout',
                'ORDER_NOW',
            ],
            [
                'No shopping, no cooking, no cleanup',
                'Dinner without the grocery run, the dishes or the reservation. A personal chef handles all of it, right in your kitchen.',
                'Dinner, handled.',
                'Personal chefs in Indy',
                'LEARN_MORE',
            ],
            [
                'Meal prep for the week',
                'Your meals for the week, prepped fresh in your own kitchen by a local chef. Pick the menu, they do the rest.',
                'Meal prep, done for you',
                'Taist chefs do meal prep too',
                'LEARN_MORE',
            ],
            [
                'Hosting at home',
                'Hosting friends this weekend? Order a local chef and actually enjoy your own party.',
                'Host without the stress',
                'A chef in your kitchen',
                'ORDER_NOW',
            ],
            [
                'Local chefs, their own menus',
                'Real chefs from Fishers, Carmel, Geist and downtown Indy, cooking their own menus in your kitchen.',
                'Meet your neighborhood chef',
                'Browse menus on Taist',
                'DOWNLOAD',
            ],
        ];

        foreach ($ideas as $i => [$angle, $primary, $headline, $description, $cta]) {
            DB::table('tbl_ad_backlog')->insert([
                'angle' => $angle,
                'primary_text' => $primary,
                'headline' => $headline,
                'description' => $description,
                'cta' => $cta,
                'sort' => $i,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
