<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSocialFieldsToDishPhotos extends Migration
{
    public function up()
    {
        Schema::table('tbl_dish_photos', function (Blueprint $table) {
            $table->boolean('queued_for_social')->default(false)->after('admin_notes');
            $table->text('social_caption')->nullable()->after('queued_for_social');
            $table->timestamp('last_posted_at')->nullable()->after('social_caption');
        });
    }

    public function down()
    {
        Schema::table('tbl_dish_photos', function (Blueprint $table) {
            $table->dropColumn(['queued_for_social', 'social_caption', 'last_posted_at']);
        });
    }
}
