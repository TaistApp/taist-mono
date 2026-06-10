<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CreateNewsletterSettingsTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('tbl_newsletter_settings')) {
            return;
        }

        Schema::create('tbl_newsletter_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('user_type')->unique()->comment('1 = customer, 2 = chef');
            $table->string('filter_mode', 32)
                ->comment('customer: service_area|all; chef: active|active_pending|all');
            $table->timestamps();
        });

        // Defaults: customers limited to service-area zips, chefs to active/approved only.
        DB::table('tbl_newsletter_settings')->insert([
            [
                'user_type' => 1,
                'filter_mode' => 'service_area',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_type' => 2,
                'filter_mode' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down()
    {
        Schema::dropIfExists('tbl_newsletter_settings');
    }
}
