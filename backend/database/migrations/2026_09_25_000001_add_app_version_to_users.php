<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which app build each user last opened. Raising MIN_VERSION strands anyone
 * below it (every build up to 32.4.7 freezes on the splash instead of showing
 * the update screen), so before raising it we need to know who is still on an
 * old build — chefs especially. Written by the RecordAppVersion middleware;
 * reported by `php artisan app:versions`.
 */
class AddAppVersionToUsers extends Migration
{
    public function up()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->string('app_version', 20)->nullable();
            $table->string('app_build', 20)->nullable();
            $table->string('app_platform', 10)->nullable();
            $table->timestamp('app_seen_at')->nullable()->index();
        });
    }

    public function down()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->dropIndex(['app_seen_at']);
            $table->dropColumn(['app_version', 'app_build', 'app_platform', 'app_seen_at']);
        });
    }
}
