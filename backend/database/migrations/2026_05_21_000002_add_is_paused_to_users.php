<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a self-service "pause" flag for chefs. A paused chef stays a real,
 * verified chef (verified=1, is_pending=0) but is hidden from customer search
 * and from availability reminders until they reactivate. This is the soft
 * alternative to the hard "Delete Account" path.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->boolean('is_paused')->default(0)->after('is_pending');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->dropColumn('is_paused');
        });
    }
};
